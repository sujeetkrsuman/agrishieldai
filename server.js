import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for in-memory file handling
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to get Gemini client
const getGeminiClient = (req) => {
  // Check Authorization header first, then env variables
  const authHeader = req.headers.authorization;
  let apiKey = process.env.GEMINI_API_KEY;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7).trim();
  }
  
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

// Crop Diseases Mock Data for Demo Mode
const mockDiagnoses = {
  tomato: {
    crop: "Tomato",
    disease: "Tomato Late Blight",
    scientificName: "Phytophthora infestans",
    confidence: 0.94,
    severity: "High",
    description: "Late blight is a destructive fungal-like disease caused by an oomycete pathogen. It spreads rapidly in cool, wet weather and can wipe out entire crops within days if left untreated. It affects leaves, stems, and fruits.",
    remedies: {
      organic: [
        "Prune and destroy infected leaves and stems immediately. Do not compost them.",
        "Apply copper-based fungicides or baking soda solutions to protect healthy foliage.",
        "Improve air circulation by pruning lower leaves and using stakes/cages."
      ],
      chemical: [
        "Apply preventive fungicides containing Chlorothalonil or Mancozeb.",
        "Use systemic fungicides containing Mefenoxam if infection is caught very early."
      ]
    },
    prevention: [
      "Avoid overhead watering; use drip irrigation to keep foliage dry.",
      "Rotate crops annually (avoid planting tomatoes or potatoes in the same soil).",
      "Plant blight-resistant tomato varieties."
    ]
  },
  potato: {
    crop: "Potato",
    disease: "Potato Early Blight",
    scientificName: "Alternaria solani",
    confidence: 0.88,
    severity: "Medium",
    description: "Early blight is a common fungal disease that causes dark brown spots with concentric 'target' rings on older leaves first. It can cause early defoliation and yield loss, especially under warm, humid conditions.",
    remedies: {
      organic: [
        "Remove and burn lower infected leaves to reduce spore spread.",
        "Apply organic bio-fungicides containing Bacillus subtilis.",
        "Mulch around the base of the plants to prevent soil-borne spores from splashing onto leaves."
      ],
      chemical: [
        "Apply protective fungicides such as Mancozeb or Chlorothalonil on a 7-10 day schedule.",
        "Use fungicides with azoxystrobin for targeted control."
      ]
    },
    prevention: [
      "Ensure proper plant spacing for quick drying of foliage.",
      "Maintain crop rotation of 3 years away from Solanaceae (tomatoes, potatoes, eggplants).",
      "Optimize nitrogen levels; stressed or nitrogen-deficient plants are more susceptible."
    ]
  },
  corn: {
    crop: "Corn (Maize)",
    disease: "Common Corn Rust",
    scientificName: "Puccinia sorghi",
    confidence: 0.91,
    severity: "Medium",
    description: "Common rust causes powdery, orange-to-cinnamon-brown pustules on both upper and lower leaf surfaces. It thrives in high humidity (95%+) and moderate temperatures (16-23°C). Severely infected leaves can yellow and die.",
    remedies: {
      organic: [
        "Remove infected plant debris at the end of the season.",
        "Apply sulfur or neem oil sprays if spots are noticed early on young plants."
      ],
      chemical: [
        "Apply foliar fungicides such as Strobilurins or Triazoles if rust threatens yield (critical during silking)."
      ]
    },
    prevention: [
      "Plant rust-resistant corn hybrids.",
      "Plant early in the season to avoid peak spore loads in late summer.",
      "Manage weeds to ensure good ventilation within the canopy."
    ]
  },
  wheat: {
    crop: "Wheat",
    disease: "Wheat Leaf Rust",
    scientificName: "Puccinia triticina",
    confidence: 0.85,
    severity: "Medium",
    description: "Leaf rust is a fungal disease that creates small, oval, reddish-orange pustules on the leaves. It disrupts photosynthesis, reduces kernel size, and can cause significant yield loss. Spores are easily carried by wind.",
    remedies: {
      organic: [
        "Destroy volunteer wheat plants before sowing the main crop (green bridge management).",
        "Apply biological control agents like Trichoderma species."
      ],
      chemical: [
        "Apply triazole or strobilurin-based systemic fungicides at the flag leaf stage if infection exceeds threshold levels."
      ]
    },
    prevention: [
      "Use resistant wheat cultivars.",
      "Observe recommended planting dates to avoid favorable climate windows for rust germination.",
      "Avoid excess nitrogen fertilization, which creates dense, humid canopies."
    ]
  },
  rice: {
    crop: "Rice",
    disease: "Rice Blast",
    scientificName: "Magnaporthe oryzae",
    confidence: 0.93,
    severity: "High",
    description: "Rice blast is one of the most destructive diseases of rice. It causes spindle-shaped spots with gray centers on leaves, and can infect leaf collars, nodes, panicles, and grains, causing 'neck rot' that breaks the stem.",
    remedies: {
      organic: [
        "Avoid excessive nitrogen fertilizers; high nitrogen makes rice plants soft and susceptible.",
        "Ensure water levels are maintained; drought-stressed plants are highly vulnerable.",
        "Burn or deeply plow infected straw after harvest to clear spores."
      ],
      chemical: [
        "Treat seeds with fungicides before planting.",
        "Apply systemic fungicides containing Tricyclazole or Azoxystrobin during the booting or panicle emission stages."
      ]
    },
    prevention: [
      "Grow blast-resistant rice varieties.",
      "Manage water levels consistently (flooded conditions reduce blast severity compared to dry soil).",
      "Synchronize planting dates within the community to avoid continuous host availability."
    ]
  },
  healthy: {
    crop: "Crop",
    disease: "Healthy Leaf (No Disease Detected)",
    scientificName: "N/A",
    confidence: 0.97,
    severity: "None",
    description: "The crop leaf appears to be healthy with normal chlorophyll distribution. No signs of fungal, bacterial, or viral infections are visible. Maintain current farming practices.",
    remedies: {
      organic: [
        "Continue organic mulching and soil conditioning.",
        "Apply preventive compost tea or diluted neem oil monthly to maintain high crop immunity."
      ],
      chemical: [
        "No chemical treatments required."
      ]
    },
    prevention: [
      "Maintain regular watering and optimal fertilization.",
      "Inspect plants weekly for early signs of pests or anomalies."
    ]
  }
};

// Chat Mock Data for Demo Mode (Regional translations of basic prompts)
const mockChatResponses = {
  en: {
    welcome: "Hello! I am your AI Agri-Advisor. How can I help you today?",
    help_watering: "For Tomatoes, soil moisture should be between 60-80%. Since your soil moisture is low, water the plants at the base with about 2-3 liters of water early in the morning to prevent evaporation.",
    help_fertilizer: "To improve tomato health, balance your N-P-K. Add organic compost for Nitrogen, bone meal for Phosphorus, and wood ash or potash for Potassium. Maintain soil pH between 6.0 and 6.8.",
    help_blight: "Late blight spreads in damp, cool conditions. Prune lower leaves to improve airflow, apply copper fungicide, and ensure you do not water the leaves directly.",
    unknown: "I understand your concern about your crop. Under the current simulated conditions, I recommend maintaining a consistent watering schedule and checking the leaves daily for any discolored spots. If you see spots, please upload a photo to the Disease Diagnostic Lab tab for an instant diagnosis!"
  },
  hi: {
    welcome: "नमस्ते! मैं आपका एआई कृषि सलाहकार हूं। आज मैं आपकी क्या मदद कर सकता हूं?",
    help_watering: "टमाटर के लिए मिट्टी की नमी 60-80% होनी चाहिए। चूंकि आपकी मिट्टी की नमी कम है, इसलिए सुबह-सुबह पौधों की जड़ों में लगभग 2-3 लीटर पानी दें ताकि वाष्पीकरण न हो।",
    help_fertilizer: "टमाटर के स्वास्थ्य को बेहतर बनाने के लिए N-P-K को संतुलित करें। नाइट्रोजन के लिए जैविक खाद, फास्फोरस के लिए हड्डी का चूरा (हड्डी का भोजन), और पोटेशियम के लिए लकड़ी की राख या पोटाश मिलाएं। मिट्टी का pH 6.0 से 6.8 के बीच रखें।",
    help_blight: "पछेती झुलसा (Late blight) नम और ठंडी परिस्थितियों में फैलता है। हवा के प्रवाह को बेहतर बनाने के लिए निचली पत्तियों को काटें, कॉपर कवकनाशी (copper fungicide) का उपयोग करें, और पत्तियों पर सीधे पानी न डालें।",
    unknown: "मैं आपकी फसल के प्रति आपकी चिंता समझता हूं। वर्तमान परिस्थितियों में, मेरा सुझाव है कि आप नियमित रूप से पानी दें और पत्तियों पर किसी भी धब्बे की रोजाना जांच करें। यदि आपको धब्बे दिखते हैं, तो तुरंत निदान के लिए रोग निदान लैब (Disease Diagnostic Lab) टैब पर एक फोटो अपलोड करें!"
  },
  te: {
    welcome: "నమస్కారం! నేను మీ AI వ్యవసాయ సలహాదారుని. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
    help_watering: "టమోటాల కోసం, నేలలో తేమ 60-80% ఉండాలి. మీ నేలలో తేమ తక్కువగా ఉన్నందున, ఉదయాన్నే మొక్కల మొదట్లో 2-3 లీటర్ల నీటిని పోయండి.",
    help_fertilizer: "టమోటా ఆరోగ్యాన్ని మెరుగుపరచడానికి N-P-K సమతుల్యం చేయండి. నత్రజని (Nitrogen) కోసం సేంద్రీయ ఎరువును, భాస్వరం (Phosphorus) కోసం ఎముకల పొడిని, మరియు పొటాషియం (Potassium) కోసం బూడిదను వాడండి. నేల pH ని 6.0 నుండి 6.8 మధ్య ఉంచండి.",
    help_blight: "లేట్ బ్లైట్ తెగులు తేమ మరియు చల్లని వాతావరణంలో వ్యాపిస్తుంది. గాలి ప్రసరణను మెరుగుపరచడానికి కింది ఆకులను కత్తిరించండి, రాగి ఆధారిత శిలీంద్ర సంహారిణిని (copper fungicide) పిచికారీ చేయండి మరియు ఆకులపై నేరుగా నీటిని పోయకండి.",
    unknown: "మీ పంట గురించి మీ ఆందోళనను నేను అర్థం చేసుకున్నాను. ప్రస్తుత పరిస్థితుల్లో, క్రమం తప్పకుండా నీరు పెట్టాలని మరియు ఆకులపై ఏవైనా మచ్చలు ఉన్నాయా అని ప్రతిరోజూ తనిఖీ చేయాలని నేను సిఫార్సు చేస్తున్నాను. మచ్చలు కనిపిస్తే, వెంటనే రోగ నిర్ధారణ కోసం వ్యాధి నిర్ధారణ ల్యాబ్ ట్యాబ్‌లో ఫోటోను అప్‌లోడ్ చేయండి!"
  },
  ta: {
    welcome: "வணக்கம்! நான் உங்கள் எடி வேளாண் ஆலோசகர். இன்று உங்களுக்கு நான் எவ்வாறு உதவ முடியும்?",
    help_watering: "தக்காளிக்கு, மண்ணின் ஈரப்பதம் 60-80% இருக்க வேண்டும். மண்ணின் ஈரப்பதம் குறைவாக உள்ளதால், காலையில் செடியின் வேர் பகுதியில் 2-3 லிட்டர் தண்ணீர் ஊற்றவும்.",
    help_fertilizer: "தக்காளி ஆரோக்கியத்தை மேம்படுத்த N-P-K அளவை சமநிலைப்படுத்தவும். நைட்ரஜனுக்கு கரிம உரம், பாஸ்பரஸுக்கு எலும்புத் தூள், மற்றும் பொட்டாசியத்திற்கு சாம்பல் சேர்க்கவும். மண்ணின் pH அளவை 6.0 முதல் 6.8 வரை பராமரிக்கவும்.",
    help_blight: "இலை கருகல் நோய் ஈரப்பதமான, குளிர்ச்சியான சூழ்நிலையில் பரவுகிறது. காற்றோட்டத்தை மேம்படுத்த கீழ் இலைகளை வெட்டி அகற்றவும், தாமிர பூஞ்சைக் கொல்லியைக் தெளிக்கவும், இலைகளில் நேரடியாகத் தண்ணீர் ஊற்றுவதைத் தவிர்க்கவும்.",
    unknown: "உங்கள் பயிர் பற்றிய கவலையை நான் புரிந்து கொள்கிறேன். தற்போதைய சூழ்நிலையில், வழக்கமான நீர்ப்பாசனத்தைப் பராமரிக்கவும், இலைகளில் ஏதேனும் புள்ளிகள் உள்ளதா என்று தினமும் கண்காணிக்கவும் பரிந்துரைக்கிறேன். ஏதேனும் புள்ளிகளைக் கண்டால், உடனடியாக நோய் கண்டறியும் ஆய்வக தாவலில் புகைப்படத்தைப் பதிவேற்றவும்!"
  },
  mr: {
    welcome: "नमस्कार! मी तुमचा एआय कृषी सल्लागार आहे. आज मी तुम्हाला कशी मदत करू शकतो?",
    help_watering: "टोमॅटोसाठी मातीतील ओलावा ६०-८०% असावा. ओलावा कमी असल्याने, बाष्पीभवन टाळण्यासाठी पहाटे झाडाच्या मुळाशी २-३ लीटर पाणी द्या.",
    help_fertilizer: "टोमॅटोचे आरोग्य सुधारण्यासाठी N-P-K संतुलित करा. नायट्रोजनसाठी सेंद्रिय खत, फॉस्फरससाठी हाडांचे खत आणि पोटॅशियमसाठी लाकडाची राख किंवा पोटॅश वापरा. मातीचा pH ६.० ते ६.८ दरम्यान ठेवा.",
    help_blight: "लेट ब्लाइट (तांबेरा) ओलसर आणि थंड हवेत पसरतो. हवा खेळती राहण्यासाठी खालची पाने छाटा, कॉपर बुरशीनाशक फवारा आणि पानांवर थेट पाणी देणे टाळा.",
    unknown: "तुमच्या पिकाविषयीची तुमची चिंता मला समजते. सध्याच्या परिस्थितीत, मी नियमित पाणी देण्याची आणि पानांवर कोणत्याही डागांची रोज तपासणी करण्याची शिफारस करतो. डाग आढळल्यास, त्वरित निदानासाठी रोग निदान लॅब टॅबवर फोटो अपलोड करा!"
  },
  bn: {
    welcome: "নমস্কার! আমি আপনার এআই কৃষি উপদেষ্টা। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
    help_watering: "টমেটোর জন্য মাটির আর্দ্রতা ৬০-৮০% হওয়া উচিত। আপনার মাটির আর্দ্রতা কম থাকায়, বাষ্পীভবন এড়াতে ভোরে গাছের গোড়ায় ২-৩ লিটার জল দিন।",
    help_fertilizer: "টমেটোর স্বাস্থ্য উন্নত করতে N-P-K এর ভারসাম্য বজায় রাখুন। নাইট্রোজেনের জন্য জৈব সার, ফসফরাসের জন্য হাড়ের গুঁড়ো এবং পটাশিয়ামের জন্য কাঠের ছাই বা পটাশ ব্যবহার করুন। মাটির pH ৬.০ থেকে ৬.৮ এর মধ্যে রাখুন।",
    help_blight: "লেট ব্লাইট রোগ স্যাঁতসেঁতে ও ঠান্ডা আবহাওয়ায় ছড়ায়। বাতাস চলাচলের উন্নতির জন্য নিচের পাতা ছেঁটে ফেলুন, কপার ছত্রাকনাশক স্প্রে করুন এবং পাতায় সরাসরি জল দেওয়া এড়ান।",
    unknown: "আপনার ফসল সম্পর্কে আপনার উদ্বেগ আমি বুঝতে পারছি। বর্তমান পরিস্থিতিতে, আমি নিয়মিত জল দেওয়ার এবং পাতায় কোনো দাগ আছে কিনা তা প্রতিদিন পরীক্ষা করার পরামর্শ দিই। দাগ দেখা দিলে, তাত্ক্ষণিক রোগ নির্ণয়ের জন্য রোগ নির্ণয় ল্যাব ট্যাবে একটি ছবি আপলোড করুন!"
  },
  kn: {
    welcome: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ಕೃಷಿ ಸಲಹೆಗಾರ. ಇವತ್ತು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    help_watering: "ಟೊಮೆಟೊ ಬೆಳೆಗೆ ಮಣ್ಣಿನ ತೇವಾಂಶವು 60-80% ಇರಬೇಕು. ಮಣ್ಣಿನ ತೇವಾಂಶ ಕಡಿಮೆ ಇರುವುದರಿಂದ, ಮುಂಜಾನೆ ಗಿಡದ ಬುಡಕ್ಕೆ 2-3 ಲೀಟರ್ ನೀರುಣಿಸಿ.",
    help_fertilizer: "ಟೊಮೆಟೊ ಬೆಳೆಯ ಆರೋಗ್ಯ ಸುಧಾರಿಸಲು N-P-K ಸಮತೋಲನಗೊಳಿಸಿ. ಸಾರಜನಕಕ್ಕಾಗಿ ಸಾವಯವ ಗೊಬ್ಬರ, ರಂಜಕಕ್ಕಾಗಿ ಮೂಳೆ ಪುಡಿ ಮತ್ತು ಪೊಟ್ಯಾಶಿಯಂಗಾಗಿ ಬೂದಿಯನ್ನು ಬಳಸಿ. ಮಣ್ಣಿನ pH ಅನ್ನು 6.0 ರಿಂದ 6.8 ರ ನಡುವೆ ಇರಿಸಿ.",
    help_blight: "ಲೇಟ್ ಬ್ಲೈಟ್ ರೋಗವು ತೇವಾಂಶ ಮತ್ತು ತಂಪಾದ ವಾತಾವರಣದಲ್ಲಿ ಹರಡುತ್ತದೆ. ಗಾಳಿಯಾಡಲು ಕೆಳಗಿನ ಎಲೆಗಳನ್ನು ಕತ್ತರಿಸಿ, ತಾಮ್ರದ ಶಿಲೀಂಧ್ರನಾಶಕವನ್ನು ಸಿಂಪಡಿಸಿ ಮತ್ತು ಎಲೆಗಳ ಮೇಲೆ ನೇರವಾಗಿ ನೀರು ಹಾಕಬೇಡಿ.",
    unknown: "ನಿಮ್ಮ ಬೆಳೆಯ ಬಗ್ಗೆ ನಿಮ್ಮ ಆತಂಕ ನನಗೆ ಅರ್ಥವಾಗಿದೆ. ಪ್ರಸ್ತುತ ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ, ನಿಯಮಿತವಾಗಿ ನೀರುಣಿಸಲು ಮತ್ತು ಎಲೆಗಳ ಮೇಲೆ ಯಾವುದೇ ಚುಕ್ಕೆಗಳಿವೆಯೇ ಎಂದು ಪ್ರತಿದಿನ ಪರಿಶೀಲಿಸಲು ಶಿಫಾರಸು ಮಾಡುತ್ತೇನೆ. ಚುಕ್ಕೆಗಳು ಕಂಡುಬಂದರೆ, ತಕ್ಷಣದ ರೋಗನಿರ್ಣಯಕ್ಕಾಗಿ ರೋಗನಿರ್ಣಯ ಲ್ಯಾಬ್ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ!"
  }
};

// Health Check API
app.get('/api/health', (req, res) => {
  const hasEnvKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "healthy",
    demoMode: !hasEnvKey,
    hasEnvKey: hasEnvKey,
    message: hasEnvKey ? "API connected to Live Gemini Engine." : "API running in Smart Demo Mode."
  });
});

// Crop Disease Diagnosis Endpoint
app.post('/api/diagnose', upload.single('image'), async (req, res) => {
  try {
    const cropType = req.body.crop ? req.body.crop.toLowerCase() : 'unknown';
    const hasImage = !!req.file;
    const client = getGeminiClient(req);

    if (!client) {
      // Return smart mock response in Demo Mode
      console.log(`[API] Running diagnosis in Demo Mode. Crop: ${cropType}`);
      // Find matching mock condition based on crop type or image file name
      let key = 'healthy';
      if (cropType.includes('tomato')) key = 'tomato';
      else if (cropType.includes('potato')) key = 'potato';
      else if (cropType.includes('corn') || cropType.includes('maize')) key = 'corn';
      else if (cropType.includes('wheat')) key = 'wheat';
      else if (cropType.includes('rice')) key = 'rice';
      else if (hasImage && req.body.imageName) {
        const name = req.body.imageName.toLowerCase();
        if (name.includes('tomato')) key = 'tomato';
        else if (name.includes('potato')) key = 'potato';
        else if (name.includes('corn') || name.includes('rust')) key = 'corn';
        else if (name.includes('wheat')) key = 'wheat';
        else if (name.includes('rice') || name.includes('blast')) key = 'rice';
      } else {
        // Fallback to random diagnosis if unknown crop uploaded to keep demo interactive
        const keys = ['tomato', 'potato', 'corn', 'wheat', 'rice'];
        key = keys[Math.floor(Math.random() * keys.length)];
      }

      // Add small processing delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      return res.json(mockDiagnoses[key]);
    }

    // Live Gemini Multimodal Code
    if (!hasImage) {
      return res.status(400).json({ error: "No image file provided for analysis." });
    }

    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert crop pathologist and agricultural AI agent. 
      Analyze this plant leaf image. Identify the crop type and detect if there is any disease present.
      
      Respond STRICTLY in JSON format matching this schema:
      {
        "crop": "Crop Name (e.g. Tomato)",
        "disease": "Disease Name or 'Healthy Leaf (No Disease Detected)' if healthy",
        "scientificName": "Scientific name of pathogen or 'N/A'",
        "confidence": 0.0 to 1.0 confidence score,
        "severity": "None" or "Low" or "Medium" or "High",
        "description": "A detailed explanation (3-4 sentences) of the disease, symptoms visible, and its progression.",
        "remedies": {
          "organic": ["Array of 2-3 organic control/treatment methods"],
          "chemical": ["Array of 1-2 chemical treatment methods or 'No chemical treatments required' if healthy"]
        },
        "prevention": ["Array of 3 agricultural prevention tips like spacing, rotation, irrigation adjustments"]
      }
    `;

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text();
    const cleanJson = JSON.parse(text);
    
    res.json(cleanJson);
  } catch (error) {
    console.error("Gemini Diagnosis Error:", error);
    res.status(500).json({ 
      error: "Failed to process image with Gemini AI. Running diagnostic fallback.",
      details: error.message 
    });
  }
});

// Chat Advisor Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, language, context } = req.body;
    const client = getGeminiClient(req);
    const lang = language || 'en';
    const messageLower = message.toLowerCase();

    if (!client) {
      // Demo Mode response
      console.log(`[API] Running chat in Demo Mode. Language: ${lang}, Context:`, context);
      await new Promise(resolve => setTimeout(resolve, 800));

      const responses = mockChatResponses[lang] || mockChatResponses['en'];
      let reply = responses.unknown;

      if (messageLower.includes('water') || messageLower.includes('irrigation') || messageLower.includes('पानी') || messageLower.includes('నీరు') || messageLower.includes('தண்ணீர்') || messageLower.includes('पाणी') || messageLower.includes('জল') || messageLower.includes('ನೀರು')) {
        reply = responses.help_watering;
      } else if (messageLower.includes('fertilizer') || messageLower.includes('npk') || messageLower.includes('soil') || messageLower.includes('खाद') || messageLower.includes('ఎరువు') || messageLower.includes('உரம்') || messageLower.includes('खत') || messageLower.includes('সার') || messageLower.includes('ಗೊಬ್ಬರ')) {
        reply = responses.help_fertilizer;
      } else if (messageLower.includes('blight') || messageLower.includes('disease') || messageLower.includes('spots') || messageLower.includes('झुलसा') || messageLower.includes('రోగం') || messageLower.includes('நோய்') || messageLower.includes('रोग') || messageLower.includes('রোগ') || messageLower.includes('ರೋಗ')) {
        reply = responses.help_blight;
      } else if (history.length === 0) {
        reply = responses.welcome;
      }

      return res.json({ response: reply });
    }

    // Live Gemini Chat Code
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare system instructions and contextual prompt
    const languageNames = {
      en: "English",
      hi: "Hindi",
      te: "Telugu",
      ta: "Tamil",
      mr: "Marathi",
      bn: "Bengali",
      kn: "Kannada"
    };
    
    const targetLanguage = languageNames[lang] || "English";
    
    const contextPrompt = `
      You are AgriShield AI, an autonomous agricultural advisor. You help farmers optimize crops and diagnose issues.
      
      CRITICAL INSTRUCTIONS:
      - Answer the farmer's question in the language: ${targetLanguage}.
      - Keep advice extremely simple, clear, practical, and list-oriented so farmers can act on it easily.
      - Never answer in Spanish. If asked, politely refuse or answer in English/Hindi.
      - Current environmental readings at the farmer's field:
        * Selected Crop: ${context?.crop || 'Tomato'}
        * Temperature: ${context?.temperature || '26'}°C
        * Humidity: ${context?.humidity || '65'}%
        * Soil Moisture: ${context?.soilMoisture || '50'}%
        * Sun Exposure: ${context?.sunExposure || 'Moderate'}
      
      Respond directly to the query. Keep response length moderate (under 150 words) for readability and speech-synthesis friendly.
    `;

    // Map history to Gemini structure
    const contents = [];
    contents.push({ role: 'user', parts: [{ text: contextPrompt }] });
    contents.push({ role: 'model', parts: [{ text: `I understand my role. I will act as AgriShield AI, providing helpful, actionable advice in ${targetLanguage} based on the farm parameters.` }] });

    // Add chat history
    for (const h of history) {
      contents.push({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const result = await model.generateContent({ contents });
    const responseText = result.response.text();
    
    res.json({ response: responseText });
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ 
      error: "Failed to query Gemini chatbot. Running local dialog proxy.",
      details: error.message 
    });
  }
});

// Helper to get local IP address
const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// Start Server listening on all interfaces (0.0.0.0)
const localIp = getLocalIp();
app.listen(port, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  AgriShield AI Server Running!`);
  console.log(`  Local Access:   http://localhost:${port}`);
  console.log(`  Network Access: http://${localIp}:${port}`);
  console.log(`  Serving static UI from public/`);
  console.log(`=======================================================`);
});
