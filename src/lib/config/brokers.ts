// Broker / Prop Firm / Trading Platform definitions

export interface Broker {
  id: string
  name: string
  slug: string
  logoPath: string
  supportedAssets: {
    stocks: boolean
    futures: boolean
    options: boolean
    forex: boolean
    crypto: boolean
    cfd: boolean
  }
  instructions: string[]
  integrationGuideUrl?: string
}

export const BROKERS: Broker[] = [
  {
    id: "ctrader",
    name: "cTrader",
    slug: "ctrader",
    logoPath: "/brokers/ctrader.svg",
    supportedAssets: {
      stocks: false,
      futures: false,
      options: false,
      forex: true,
      crypto: true,
      cfd: true,
    },
    instructions: [
      "Login to your cTrader platform.",
      "Go to the 'History' tab and select your date range.",
      "Click 'Export' and save the file in CSV format.",
      "Upload the CSV file here.",
    ],
  },
  {
    id: "topstepx",
    name: "TopstepX",
    slug: "topstepx",
    logoPath: "/brokers/topstepx.svg",
    supportedAssets: {
      stocks: false,
      futures: true,
      options: false,
      forex: false,
      crypto: false,
      cfd: false,
    },
    instructions: [
      "Login to your trading platform, find the 'Trades' Tab, and click 'EXPORT' in the bottom right corner.",
      "Save the file in CSV format to your desktop.",
      "Here on the import window, click 'Upload File' and select the file you just downloaded.",
    ],
  },
  {
    id: "tradelocker",
    name: "TradeLocker",
    slug: "tradelocker",
    logoPath: "/brokers/tradelocker.svg",
    supportedAssets: {
      stocks: false,
      futures: true,
      options: false,
      forex: true,
      crypto: true,
      cfd: true,
    },
    instructions: [
      "Login to TradeLocker and navigate to the 'History' section.",
      "Select your desired date range.",
      "Click 'Export to CSV' and save the file.",
      "Upload the CSV file here.",
    ],
  },
  {
    id: "interactive-brokers",
    name: "Interactive Brokers",
    slug: "interactive-brokers",
    logoPath: "/brokers/interactive-brokers.svg",
    supportedAssets: {
      stocks: true,
      futures: true,
      options: true,
      forex: true,
      crypto: true,
      cfd: false,
    },
    instructions: [
      "Login to IBKR Client Portal or TWS.",
      "Go to 'Reports' → 'Flex Queries'.",
      "Create a Trade Confirmation Flex Query.",
      "Run the query and download as CSV.",
      "Upload the CSV file here.",
    ],
  },
  {
    id: "metatrader4",
    name: "MetaTrader 4",
    slug: "metatrader4",
    logoPath: "/brokers/metatrader4.svg",
    supportedAssets: {
      stocks: false,
      futures: false,
      options: false,
      forex: true,
      crypto: false,
      cfd: true,
    },
    instructions: [
      "Open MetaTrader 4 and go to 'Account History' tab.",
      "Right-click and select 'All History' or your preferred date range.",
      "Right-click again and select 'Save as Report'.",
      "Save as HTML or use third-party tool to export CSV.",
      "Upload the file here.",
    ],
  },
  {
    id: "metatrader5",
    name: "MetaTrader 5",
    slug: "metatrader5",
    logoPath: "/brokers/metatrader5.svg",
    supportedAssets: {
      stocks: true,
      futures: true,
      options: false,
      forex: true,
      crypto: true,
      cfd: true,
    },
    instructions: [
      "Open MetaTrader 5 and go to 'History' tab.",
      "Right-click and select your desired period.",
      "Right-click again and select 'Report'.",
      "Export as HTML or CSV format.",
      "Upload the file here.",
    ],
  },
  {
    id: "thinkorswim",
    name: "Thinkorswim",
    slug: "thinkorswim",
    logoPath: "/brokers/thinkorswim.svg",
    supportedAssets: {
      stocks: true,
      futures: true,
      options: true,
      forex: true,
      crypto: false,
      cfd: false,
    },
    instructions: [
      "Login to Thinkorswim desktop or web platform.",
      "Go to 'Monitor' → 'Account Statement'.",
      "Select your date range.",
      "Click 'Export' and save as CSV.",
      "Upload the CSV file here.",
    ],
  },
  {
    id: "tradovate",
    name: "Tradovate",
    slug: "tradovate",
    logoPath: "/brokers/tradovate.svg",
    supportedAssets: {
      stocks: false,
      futures: true,
      options: false,
      forex: false,
      crypto: false,
      cfd: false,
    },
    instructions: [
      "Login to Tradovate and go to 'Reports'.",
      "Select 'Trade History' and your date range.",
      "Click 'Export' to download as CSV.",
      "Upload the CSV file here.",
    ],
  },
]

// Get broker by ID
export function getBrokerById(id: string): Broker | undefined {
  return BROKERS.find(b => b.id === id)
}

// Search brokers by name
export function searchBrokers(query: string): Broker[] {
  const lowerQuery = query.toLowerCase()
  return BROKERS.filter(b => 
    b.name.toLowerCase().includes(lowerQuery)
  )
}

