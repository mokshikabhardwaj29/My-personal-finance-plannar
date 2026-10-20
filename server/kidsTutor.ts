import { GoogleGenAI } from '@google/genai';
import { Request, Response } from 'express';

// Shared Gemini client with telemetry header as required by AI Studio guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface KidsLearnPayload {
  mode: 'ask' | 'story' | 'quiz' | 'need-vs-want';
  prompt: string;
  ageGroup?: 'junior' | 'explorer' | 'teen'; // junior: 6-9, explorer: 10-13, teen: 14-17
  language?: 'english' | 'hinglish' | 'hindi';
  storyStep?: number;
  storyChoice?: string;
}

// Built-in educational fallback responses if API key is absent or network fails
const CURRICULUM_FALLBACKS: Record<string, { title: string; answer: string; funChallenge: string }> = {
  print_money: {
    title: 'Why can’t countries just print infinite ₹500 notes?',
    answer:
      'Imagine if every kid in your classroom suddenly had 1,000 shining Pokemon cards or marbles! Would a marble still feel rare and special? Nope! \n\nMoney works the exact same way. If the government (like the Reserve Bank of India) printed truckloads of ₹500 notes for everyone, shopkeepers would realize money is everywhere. A packet of biscuits that used to cost ₹20 would quickly start costing ₹500 or ₹2,000! This tricky problem is called **Inflation (महंगाई)**. Money only holds value when it represents real things made, like cars, mangoes, toys, and services!',
    funChallenge: 'Mini Mission: Spot 3 things at home that your family bought with hard-earned rupees, and ask how they were made!',
  },
  needs_vs_wants: {
    title: 'What is the secret difference between Needs and Wants?',
    answer:
      'Think of it like this:\n\n🍎 **Needs (ज़रूरतें)**: Things you MUST have to stay healthy, safe, and go to school (clean water, wholesome food, school books, a warm bed, clothes).\n\n🎮 **Wants (इच्छाएँ)**: Things that are super fun and exciting, but you can live happily without (new video game skins, 5th pair of sneakers, fancy ice-cream sundaes).\n\nPenny’s Golden Tip: It is 100% okay to have wants! The smart habit is taking care of your Needs first, then saving up your pocket money in ₹ to celebrate your Wants without stress.',
    funChallenge: 'Detective Challenge: Walk around your room and find 2 pure Needs and 2 super-fun Wants!',
  },
  compounding: {
    title: 'What is Compound Interest (जादूई चक्रवृद्धि ब्याज)?',
    answer:
      'Imagine you plant a single magic mango seed in your garden. Next year, that tree gives you 5 juicy mangoes. Instead of eating them all, you plant the seeds of those 5 mangoes! \n\nSoon you have 6 trees, then 30 trees, then an entire forest! \n\nThat is **Compound Interest**! When you save your money in a bank or mutual fund, the bank gives you a little reward called Interest. When your interest earns its own interest, your ₹500 quietly multiplies into thousands over time without you lifting a finger!',
    funChallenge: 'Math Magic: If you double 1 rupee every day (1 -> 2 -> 4 -> 8 -> 16), in just 30 days you would have over ₹50 CRORE! Try calculating day 1 to 10 on paper!',
  },
  piggy_bank: {
    title: 'How to manage your pocket money using the 3-Jar Rule?',
    answer:
      'Whenever you get pocket money or gift money from grandparents (e.g. ₹200 on your birthday):\n\n1. 🟢 **Spend Jar (50% = ₹100)**: For current fun, stationery, books, or a treat.\n2. 🟡 **Dream / Save Jar (30% = ₹60)**: For something bigger you really want in a few months (like a football, bicycle, or board game).\n3. 🟣 **Give / Share Jar (20% = ₹40)**: For buying a birthday card for a friend, sharing sweets, or helping an animal shelter.\n\nSeparating your rupees gives you complete control!',
    funChallenge: 'DIY Craft: Take 3 empty jam jars or paper cups and label them "Spend", "Dream", and "Share"!',
  },
  banks_and_upi: {
    title: 'How does a Bank and QR Code / UPI payment work?',
    answer:
      'When your parents scan a Google Pay / Paytm QR code at a grocery store, where does the money come from? Is it magic? \n\nNo, it comes from a secure digital vault called a **Bank Account**! In olden days, people carried heavy bags of coins. Today, a bank holds your rupees safely in computer records. When you tap or scan UPI, the bank instantly moves numbers from your parents’ vault to the shopkeeper’s vault. It is real money, not play points!',
    funChallenge: 'Family Chat: Next time you visit a shop, observe how the shopkeeper’s soundbox chimes when the rupees arrive!',
  },
};

export async function handleKidsLearn(req: Request, res: Response) {
  try {
    const {
      mode = 'ask',
      prompt = '',
      ageGroup = 'explorer',
      language = 'english',
      storyStep = 1,
      storyChoice = '',
    } = req.body as KidsLearnPayload;

    const trimmedPrompt = (prompt || '').trim();

    // Age bracket guidelines
    const ageGuidance =
      ageGroup === 'junior'
        ? 'Target audience is young children aged 6 to 9. Use very simple words, warm playful metaphors (candies, toy blocks, playground games, storybook characters), short sentences, and huge encouragement.'
        : ageGroup === 'teen'
        ? 'Target audience is young adults aged 14 to 17. Use engaging, mature, practical language covering real topics like digital banking, UPI, budgeting, side projects, compound interest, and college savings with relatable Indian teenage context.'
        : 'Target audience is kids aged 10 to 13. Balance fun storytelling with real financial concepts (pocket money in ₹, saving for a cycle, bank accounts, smart shopping choices, compounding).';

    // Language guidelines
    const langGuidance =
      language === 'hinglish'
        ? 'Explain primarily in friendly conversational Hinglish (blend of natural Hindi words written in English or Devanagari like "बचत (Bachat)", "पॉकेट मनी", "इच्छा vs ज़रूरत", "जादुई कंपाउंडिंग", "शाबाश!").'
        : language === 'hindi'
        ? 'Explain in pure, gentle, friendly Hindi with clear terminology so Indian kids and parents can learn together.'
        : 'Explain in enthusiastic, clear, encouraging English, naturally using Indian Rupee (₹) amounts and relatable Indian cultural references (e.g., Diwali gift money, school canteens, stationery shops).';

    // If Gemini API Key is available, make the call using gemini-3.8-flash
    if (process.env.GEMINI_API_KEY) {
      try {
        let systemInstruction = `You are Penny, the cheerful, warm, and wise golden coin mascot from the NotePay financial literacy app.
Your mission is to make financial literacy joyful, fascinating, and empowering for young learners.
Never give formal financial or investment advice. Focus purely on teaching sound money habits, budgeting, compound interest, needs vs wants, and smart decision-making.
Always format currency in Indian Rupees (₹).
${ageGuidance}
${langGuidance}`;

        let userContent = '';

        if (mode === 'ask') {
          userContent = `A curious student asks Penny: "${trimmedPrompt || 'How can I save money?'}"
Provide a warm, captivating answer in 3 sections:
1. 💡 **The Big Idea** (A friendly, vivid analogy)
2. 🪙 **How It Actually Works** (Bullet points with real ₹ examples)
3. 🎯 **Penny's Mini Mission** (A fun, zero-pressure activity to try today)`;
        } else if (mode === 'story') {
          userContent = `Create an interactive money adventure story starring the child and Penny!
Context: The child has ₹500 in pocket money.
Previous choice made: "${storyChoice || 'Starting the adventure at the City Fair / Mela'}".
Story step: ${storyStep}.
Write a captivating, dramatic, fun 150-word scene where they encounter a real money choice.
End with exactly 2 or 3 clear, distinct choices for what to do with their ₹ rupees next (e.g. Option A: Buy the mega toy, Option B: Rent the ride and save the rest, Option C: Buy fresh treats to share).`;
        } else if (mode === 'quiz') {
          userContent = `Generate a fun, 3-question multiple choice financial quiz for kids about: "${trimmedPrompt || 'Smart Money Habits and Saving'}".
Format as JSON:
{
  "topic": "Topic Name",
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why this is right and what Penny loves about it!"
    }
  ]
}`;
        } else if (mode === 'need-vs-want') {
          userContent = `Explain whether "${trimmedPrompt}" is a Need or a Want (or how it depends on the situation!).
Give a balanced, guilt-free explanation with a fun score out of 10 for necessity and joy.`;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userContent,
          config: {
            systemInstruction,
            temperature: 0.7,
            ...(mode === 'quiz' ? { responseMimeType: 'application/json' } : {}),
          },
        });

        const textOutput = response.text || '';
        return res.json({
          success: true,
          mode,
          result: textOutput,
          source: 'gemini-3.8-flash',
        });
      } catch (geminiError) {
        console.warn('Gemini API call failed, falling back to curriculum:', geminiError);
        // Fallback to rich curriculum
      }
    }

    // Fallback response handler
    const promptLower = trimmedPrompt.toLowerCase();
    let fallback = CURRICULUM_FALLBACKS.print_money;

    if (promptLower.includes('want') || promptLower.includes('need') || mode === 'need-vs-want') {
      fallback = CURRICULUM_FALLBACKS.needs_vs_wants;
    } else if (promptLower.includes('compound') || promptLower.includes('grow') || promptLower.includes('interest')) {
      fallback = CURRICULUM_FALLBACKS.compounding;
    } else if (promptLower.includes('pocket') || promptLower.includes('piggy') || promptLower.includes('jar')) {
      fallback = CURRICULUM_FALLBACKS.piggy_bank;
    } else if (promptLower.includes('bank') || promptLower.includes('upi') || promptLower.includes('qr')) {
      fallback = CURRICULUM_FALLBACKS.banks_and_upi;
    }

    if (mode === 'quiz') {
      return res.json({
        success: true,
        mode: 'quiz',
        source: 'curriculum-engine',
        result: JSON.stringify({
          topic: 'Smart Money Fundamentals',
          questions: [
            {
              id: 1,
              question: 'If you receive ₹500 as a birthday gift, what is the smartest first move?',
              options: [
                'Spend all ₹500 immediately on candy',
                'Hide it under a sofa cushion and forget it',
                'Put some in your Dream Jar to save, and enjoy the rest on things you love',
                'Give it away to a stranger',
              ],
              correctIndex: 2,
              explanation:
                'Spot on! Splitting your money ensures you both celebrate today and build your dreams for tomorrow!',
            },
            {
              id: 2,
              question: 'Which of these is a pure "Need"?',
              options: [
                'School notebook and pencils',
                'The newest limited edition video game',
                'A third pair of sunglasses',
                'Giant butter popcorn at the cinema',
              ],
              correctIndex: 0,
              explanation:
                'Exactly! Books and school supplies help your education and future, making them true Needs.',
            },
            {
              id: 3,
              question: 'Why do banks give you Interest when you deposit rupees with them?',
              options: [
                'Because they have extra coins to throw away',
                'Because they use your money to give loans to businesses, and share a part of the earnings with you',
                'It is just an accident',
                'Banks take money away, they never give interest',
              ],
              correctIndex: 1,
              explanation:
                'Brilliant! Banks pay you interest as a thank-you for letting them use your deposits safely.',
            },
          ],
        }),
      });
    }

    const compiledText = `### 💡 ${fallback.title}\n\n${fallback.answer}\n\n### 🎯 Penny's Mission:\n${fallback.funChallenge}`;

    return res.json({
      success: true,
      mode,
      result: compiledText,
      source: 'curriculum-engine',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error in kids learning engine';
    return res.status(500).json({ error: message });
  }
}
