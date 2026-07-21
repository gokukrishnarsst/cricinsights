import { Saira_Condensed, Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

export const sairaCondensed = Saira_Condensed({
  variable: "--font-din-cond",
  weight: ["500", "700"],
  subsets: ["latin"],
});

export const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export { SYSTEM_PROMPT, buildAgentInstructions, DATA_LIMITATIONS, AGENT_ID } from "@/lib/agent/prompts";
