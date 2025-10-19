
import { GoogleGenAI, Modality } from "@google/genai";
import type { TryOnInputs, CompositeResult, ImageData } from '../types';

// FIX: Per coding guidelines, API key must be obtained from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: "AIzaSyBtttorFtbSCz3kjblYlSgyTfdtkDCID3A" });

const DEFAULT_SCENE_DESCRIPTION = "A white fashion catwalk with 1-2 people visible in the out-of-focus audience.";

const heightDescriptions = {
  'Short': "visibly short in stature, with corresponding proportions. This is a key physical trait.",
  'Average': "of average height with standard, balanced proportions.",
  'Tall': "distinctly tall and statuesque, with elongated proportions, characteristic of a high-fashion model."
};

const bodyTypeDescriptions = {
  'Slim': "a slender, slim physique with low body fat. Elegant and lean.",
  'Average': "a healthy, average build. Well-proportioned, neither overtly muscular nor thin.",
  'Athletic': "an athletic, toned physique with visible muscle definition, especially in the arms, legs, and core. Think of a dancer or sprinter. This is a key physical trait.",
  'Muscular': "a powerful, muscular build with significant and clearly defined muscle mass, more so than a typical 'athletic' frame. Think of a fitness model or bodybuilder. This is a key physical trait.",
  'Curvy': "a full-figured, curvy body shape with a defined waist and rounded hips and bust; a plus-size physique. This is a key physical trait."
};

const bustDescriptions = {
  'Small': "a small bust size, similar to an A or B cup. This is a key physical trait.",
  'Medium': "a medium, average bust size, similar to a C cup.",
  'Large': "a large, full bust size, similar to a D or DD cup. This must be clearly visible. Crucially, this must not alter the design of the specified clothing (e.g., do not lower the neckline). The clothing's design is immutable; only its fit and drape should change to accommodate the bust size.",
  'Extra Large': "an extra-large, very prominent bust size, similar to an E cup or larger. This is a critical instruction and the bust must be generously and accurately depicted. Crucially, this must not alter the design of the specified clothing (e.g., do not lower the neckline). The clothing's design is immutable; only its fit and drape should change to accommodate the bust size."
};


function buildPrompt(referenceSheet: ImageData, inputs: TryOnInputs): any[] {
  const hatName = inputs.selectedHat?.name || 'Untitled';
  const sceneDescription = inputs.sceneText || DEFAULT_SCENE_DESCRIPTION;

  const facePrompt = inputs.face === 'Model-fy me!'
    ? `**ABSOLUTE COMMAND: Your primary objective is to create an idealized, high-fashion version of the person in the 'SUBJECT' section of the provided reference image, while retaining a strong, recognizable likeness. This is your most important rule. You must retain their core facial structure, age, gender, and race, but apply professional beautification techniques. The goal is a 'model-fied' version, not an identical twin. Do not make them look older. The nose must be proportional but can be subtly refined. All other instructions are secondary to this command.**`
    : `**ABSOLUTE COMMAND: Your primary, non-negotiable objective is to create a photographic double of the person in the 'SUBJECT' section of the provided reference image. The final face must be so accurate that it is instantly and unquestionably recognizable as the same person. This is your most important rule. You must perfectly replicate their core facial structure: bone structure, eye shape and color, nose shape and size, and mouth shape. If the final face is not a perfect replica of their core structure, you have failed the entire task.

**PRESERVATION OF FEATURES (NON-NEGOTIABLE):** You MUST preserve all unique, defining facial characteristics of the subject. You are explicitly FORBIDDEN from removing or altering features such as:
- Facial hair (beards, mustaches, stubble)
- Moles, beauty marks, and freckles
- Scars
- Distinctive wrinkles or smile lines that are core to their identity.

After, and only after, you have achieved a perfect structural likeness and committed to preserving all unique features, you must then apply subtle beautification and de-aging techniques to make the subject appear approximately 10 years younger than they do in the reference photo.

**DE-AGING & BEAUTIFICATION RULES (Apply these to the perfect structural replica):**
- **SKIN:** Even out skin tone, remove temporary blemishes, and apply a subtle smoothing to create a healthy, youthful 'glow'. Significantly soften fine lines and wrinkles (especially crow's feet, forehead lines, and nasolabial folds) but do not erase them entirely, especially if they are a defining characteristic. The skin must retain realistic texture.
- **VOLUME:** Restore a touch of youthful fullness to the cheeks and under-eye area to counteract natural volume loss.
- **JAWLINE:** Subtly tighten and define the jawline for a sharper silhouette.
- **PROHIBITED ALTERATIONS:** You are forbidden from changing the fundamental bone structure. Do not alter the size or shape of the nose, eyes, or lips from the reference photo. The goal is not to create a different person, but a refreshed, vibrant, and slightly younger version of the *same* person. Avoid any 'plastic' or overly airbrushed appearances.`;
    
  const outfitDescription = [
    inputs.clothingText,
    inputs.shoesText,
    inputs.accessoriesText
  ].filter(Boolean).join('. ');

  const hasWardrobeImages = inputs.wardrobeImages.length > 0 || inputs.shoesImages.length > 0 || inputs.accessoriesImages.length > 0;

  let outfitPrompt = '';
  if (hasWardrobeImages) {
    outfitPrompt = `- **OUTFIT (IMAGE-DRIVEN):** The user has provided specific images for the outfit (clothing, shoes, and/or accessories). This is a deconstruction and reconstruction task, not a copy-paste operation. You MUST use these images as the absolute, non-negotiable source for the corresponding outfit items. Analyze the garment's design, fabric, and texture, then intelligently re-drape it onto the generated model, creating new, realistic shadows and folds that match the new pose. You are **STRICTLY FORBIDDEN** from copying the pose, lighting, background, or any person from the reference garment images. Recreate the items from the images with perfect fidelity. Do not invent new items. If text is also provided ("${outfitDescription}"), use it to clarify details about the items in the images. This is your most critical instruction regarding the outfit.`;
  } else if (outfitDescription) {
    outfitPrompt = `- **OUTFIT (TEXT-DRIVEN):** The subject's outfit MUST be: "${outfitDescription}". If this is not a full description, complete the outfit in a bold, creative, unquestionably high-fashion style that is in perfect color harmony with the hat.`;
  } else {
    outfitPrompt = `- **OUTFIT (CREATIVE):** Infer the subject's gender from their photo and dress them in a **bold, creative, unquestionably high-fashion outfit** that is in **perfect color harmony** with the hat. AVOID CLASHING HUES and safe/plain designs.`;
  }
  
  let logoPrompt = '';
  const isCustomScene = inputs.sceneImage || inputs.sceneText;
  if (!isCustomScene) {
      logoPrompt = `- **LOGO (MANDATORY):** On the back wall, positioned directly behind the subject at neck level, the text 'Kathryn Lee Millinery' MUST be rendered. The text must be in a clean, legible, classic serif font and written in Title Case (not all caps). The text must be out-of-focus/blurred but still clearly readable.`;
  }

  const heightDescription = heightDescriptions[inputs.height];
  const bodyTypeDescription = bodyTypeDescriptions[inputs.bodyType];
  const bustDescription = bustDescriptions[inputs.bust];
  const augmentedNegativePrompt = `${inputs.negativePrompt}, grid layouts, quadrants, image collages, picture-in-picture, borders, frames, margins, padding, split-screen`;

  const promptText = `
${facePrompt}

Your task is to analyze the single provided reference image and create a new, photorealistic portrait based on its contents and the following rules. **CRITICAL: You must synthesize a completely new image. The provided reference grid is for analysis only; it must be completely discarded and must not appear in the final output in any way.**

**HAT SECURITY PROTOCOL (ABSOLUTE, NON-NEGOTIABLE RULE):**
1.  **THE ONE TRUE HAT:** The hat shown in the 'HAT REFERENCE' quadrants of the 2x2 grid is the **only** hat you are permitted to render. Its design, color, and style are immutable and must be replicated with perfect fidelity.
2.  **OVERRIDE ALL OTHER INPUT:** This rule overrides any and all user input related to headwear.
3.  **IGNORE CONFLICTING TEXT:** You must scan all user-provided text inputs. If you find any keywords related to other headwear (e.g., "hat," "cap," "beret," "fedora," "fascinator," "beanie," "headband"), you MUST IGNORE that specific part of the user's text. Do not draw a different hat.
4.  **IGNORE CONFLICTING IMAGES:** If any of the optional user-uploaded images (for clothing, accessories, etc.) contain a prominent hat that is not the selected hat from the reference grid, you MUST IGNORE the hat in that reference image. Your sole source for the hat is the 'HAT REFERENCE' quadrants.

**FACIAL FIDELITY (ABSOLUTE RULE):** The ONLY source for the generated person's face is the 'SUBJECT' quadrant of the main 2x2 reference grid. You are explicitly and strictly **FORBIDDEN** from using or being influenced by any faces that may appear in the optional user-provided images for clothing, shoes, accessories, or scene. Those faces are irrelevant and must be ignored.

**REFERENCE IMAGE ANALYSIS:**
The provided image is a 2x2 reference grid.
1.  **TOP-LEFT (SUBJECT):** This quadrant contains the portrait of the person you MUST replicate based on the absolute command above.
2.  **OTHER QUADRANTS (HAT REFERENCE):** The other three quadrants show the hat to be placed on the subject. The hat's official title is: "${hatName}". Use all images in this section to build a complete and accurate 3D model of the hat in your memory.

**FINAL IMAGE SYNTHESIS RULES:**
- **IMAGE SPECIFICATIONS (NON-NEGOTIABLE):** The final output MUST be a vertical portrait with exact dimensions of 1080 pixels wide by 1350 pixels tall. This is a strict 4:5 aspect ratio. It is not optional. Do not generate a square or landscape image. 
- **OUTPUT INTEGRITY (ABSOLUTE RULE):** The final output is one single, clean image. It is forbidden to include the reference grid, quadrants, collages, or any borders in the final image. You MUST discard the reference grid after analysis. The image content must bleed to the absolute edge of the 1080x1350 frame with NO borders or margins.
- **COMPOSITION:** Place the perfect 3D model of the hat from the 'HAT REFERENCE' section onto the head of the person from the 'SUBJECT' section.
- **FRAMING:** The final image MUST be a **full-length shot** from head to toe. The subject (including hat and shoes) MUST be fully visible. To guarantee nothing is cropped, compose the shot so the subject occupies approximately **90-95% of the vertical height of the image.** This creates a natural margin at the top and bottom. **DO NOT let the hat or feet touch the edges of the frame.**
- **POSE & EXPRESSION:**
    - **POSE:** The subject's pose MUST be: "${inputs.controlsText || 'walking'}"
    - **HEAD ANGLE:** Pose the subject with a subtle, natural head tilt or turn; avoid a perfectly straight-on, passport-photo look.
    - **EXPRESSION:** The expression must be confident and high-fashion, with a completely neutral mouth. No smile or grin. **Do not show teeth.**
- **AESTHETICS & STYLING:**
    - **SCENE:** The background MUST be: "${sceneDescription}"
    - **SUBJECT PHYSICAL ATTRIBUTES (ABSOLUTE COMMANDS - YOU MUST FOLLOW THESE EXACTLY):**
        - **HEIGHT:** The subject's height MUST be depicted as **${inputs.height}**. This means they should appear ${heightDescription}.
        - **BODY TYPE:** The subject's body type MUST be **${inputs.bodyType}**. This means they must have ${bodyTypeDescription}.
        - **BUST SIZE (FEMALE SUBJECTS):** If the subject is female, her bust size MUST be depicted as **${inputs.bust}**. This means she must have ${bustDescription}. This is a critical and non-negotiable aspect.
    ${logoPrompt}
    ${outfitPrompt}
        - **If a woman:** She must be wearing earrings, a handbag, and high heels. The outfit (dress, suit, etc.) must be avant-garde, using luxurious fabrics and striking patterns. Apply subtle, complementary makeup that looks realistic and enhances her features without altering them. This MUST include lipstick in a natural red or pink tone. Do not use bold or unnatural lipstick colors like blue or purple. The subject's lips must be the same size as in the source photo, or very slightly fuller if the source lips appear thin. **Under no circumstances should you reduce lip size.** The final look should be natural, not over-filled.
        - **If a man:** He must wear a stylish, bold, modern suit (e.g., double-breasted, unique fabrics, patterns like plaid/pinstripes). AVOID simple grey/black suits. He must have a collared shirt with a necktie/bowtie/ascot. He must hold **exactly one** stylish accessory: a medium or small men's handbag, binoculars, a leather-bound book, a long elegant umbrella, or a full-length, coordinated cane.
- **FINAL CHECKLIST (MANDATORY):**
    - **VERIFY LIKENESS:** Does the face in your generated image look EXACTLY like the person in the 'SUBJECT' section (or a model-fied version, if requested)? Is the age, race, gender, and unique features (facial hair, moles etc.) correct? If not, you have failed. Start over and fix it.
    - **VERIFY PHYSICAL ATTRIBUTES:** Does the subject's body match the specified height, body type, and bust size? If not, you have failed. Re-read the **SUBJECT PHYSICAL ATTRIBUTES** rules and correct the image.
    - **VERIFY HAT:** Is the hat identical to the 'HAT REFERENCE' section? Did you ignore all other hat-related user input? If not, fix it.
    - **VERIFY BORDERS:** Are there any white margins or borders? If so, you have failed. The image must bleed to the edge.
    - **VERIFY GRID:** Is the final image a single, clean portrait? Does it contain any part of the original 2x2 grid layout? If it does, you have failed. The grid is for reference only.
    - **VERIFY FRAMING:** Is it a full-length, uncropped shot with space above the hat and below the feet?
- **NEGATIVE PROMPT (AVOID THESE):** ${augmentedNegativePrompt}
`;

  const parts = [
    { text: promptText },
    { inlineData: { data: referenceSheet.base64, mimeType: referenceSheet.mimeType } }
  ];

  // Add all user-provided optional images
  const allOptionalImages = [
    ...inputs.wardrobeImages,
    ...inputs.shoesImages,
    ...inputs.accessoriesImages,
  ];
  if (inputs.sceneImage) {
    allOptionalImages.push(inputs.sceneImage);
  }

  for (const img of allOptionalImages) {
    parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
  }

  return parts;
}


export const generateComposite = async (referenceSheet: ImageData, inputs: TryOnInputs): Promise<CompositeResult> => {
  // FIX: Per coding guidelines, check for process.env.API_KEY.
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const mainPromptParts = buildPrompt(referenceSheet, inputs);

  const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: mainPromptParts },
      config: {
          responseModalities: [Modality.IMAGE],
      },
  });

  let mainImageBase64: string | null = null;
  const warnings: string[] = [];

  for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
          mainImageBase64 = part.inlineData.data;
      }
      if(part.text){
          warnings.push(part.text);
      }
  }

  if (!mainImageBase64) {
      const refusalText = warnings.join(' ') || "The model did not return an image. It might have refused the request based on the inputs or safety policies.";
      throw new Error(refusalText);
  }

  const result: CompositeResult = {
      mainImage: mainImageBase64,
      mimeType: 'image/jpeg',
      metadata: {
          hat_image_url: inputs.selectedHat?.name || 'N/A',
          warnings: warnings,
      }
  };

  return result;
};


export const refineComposite = async (previousResult: CompositeResult, prompt: string): Promise<CompositeResult> => {
  // FIX: Per coding guidelines, check for process.env.API_KEY.
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }

  const previousImagePart = {
    inlineData: {
      data: previousResult.mainImage,
      mimeType: previousResult.mimeType,
    },
  };

  const textPart = {
    text: `**Refinement Directive:**\n- **ABSOLUTE RULE: THE HAT'S DESIGN IS IMMUTABLE. DO NOT CHANGE IT.** If the user asks to 'rotate the hat', you must rotate the *existing* hat as if it were a 3D object. You are forbidden from re-interpreting its style. A beret MUST remain a beret, not become a boater hat.\n- **User Request:** "${prompt}"\n- **Instructions:** Modify the image based *only* on the user's request. Preserve all other details of the image perfectly, including the subject's face, the background, and any part of the outfit not mentioned in the request. The final output MUST maintain the exact 1080x1350 (4:5) aspect ratio. Do not change the aspect ratio to a square or any other format.`
  };
  
  const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [previousImagePart, textPart] },
      config: {
          responseModalities: [Modality.IMAGE],
      },
  });

  let mainImageBase64: string | null = null;
  const warnings: string[] = [];

  for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
          mainImageBase64 = part.inlineData.data;
      }
      if (part.text) {
          warnings.push(part.text);
      }
  }

  if (!mainImageBase64) {
      const refusalText = warnings.join(' ') || "The model did not return a refined image. It might have refused the request based on the inputs or safety policies.";
      throw new Error(refusalText);
  }

  return {
    ...previousResult, 
    mainImage: mainImageBase64,
    mimeType: 'image/jpeg', 
    metadata: {
      ...previousResult.metadata,
      warnings, 
    },
  };
};
