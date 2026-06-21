import { notFound } from "next/navigation";
import { Metadata } from "next";
import TopupFormClient from "./TopupFormClient";

interface PageProps {
  params: Promise<{
    game: string;
  }>;
}

const GAME_DATA: Record<string, any> = {
  "mobile-legends": {
    name: "Mobile Legends: Bang Bang",
    developer: "Moonton",
    logo: "https://upload.wikimedia.org/wikipedia/en/2/23/Mobile_Legends_Bang_Bang_logo.png",
    cover: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1778309830-6olb9uli-file-1746236477-ldmdsn2k-1.jpg?w=200&q=75",
    fields: [
      { id: "userId", label: "User ID", placeholder: "Contoh: 12345678" },
      { id: "zoneId", label: "Zone ID", placeholder: "Contoh: 1234" },
    ],
    items: [
      { id: "ml_19", name: "19 Diamonds (17+2 Bonus)", price: 5548, originalPrice: 5548, icon: "💎" },
      { id: "ml_44", name: "44 Diamonds (40+4 Bonus)", price: 12103, originalPrice: 12103, icon: "💎" },
      { id: "ml_59", name: "59 Diamonds (53+6 Bonus)", price: 16152, originalPrice: 16152, icon: "💎" },
      { id: "ml_592", name: "592 Diamonds (512+80 Bonus)", price: 163734, originalPrice: 181927, discount: "10%", icon: "💎" },
      { id: "ml_875", name: "875 Diamonds (774+101)", price: 235887, originalPrice: 235887, icon: "💎" },
      { id: "ml_6030", name: "6030 Diamonds (5124+906)", price: 1579837, originalPrice: 1974796, discount: "20%", icon: "💎" },
      { id: "ml_wdp_1", name: "Weekly Diamond Pass", price: 28686, originalPrice: 31873, discount: "10%", icon: "🎟️" },
      { id: "ml_wdp_3", name: "Weekly Diamond Pass x3", price: 86955, originalPrice: 108694, discount: "20%", icon: "🎟️" },
      { id: "ml_wdp_5", name: "Weekly Diamond Pass x5", price: 144924, originalPrice: 181155, discount: "20%", icon: "🎟️" },
      { id: "ml_1220", name: "1220 Diamonds (1075+145)", price: 331177, originalPrice: 331177, icon: "💎" },
      { id: "ml_2885", name: "2885 Diamond (2482+403)", price: 736678, originalPrice: 736678, icon: "💎" },
      { id: "ml_21330", name: "21330 Diamonds (17720+3610)", price: 5428479, originalPrice: 5428479, icon: "💎" },
    ],
  },
  "magic-chess-gogo": {
    name: "Magic Chess GOGO",
    developer: "Moonton",
    logo: "https://upload.wikimedia.org/wikipedia/en/2/23/Mobile_Legends_Bang_Bang_logo.png",
    cover: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236484-0j9idri1-4.jpg?w=160&q=75",
    fields: [
      { id: "userId", label: "User ID", placeholder: "Contoh: 12345678" },
      { id: "zoneId", label: "Zone ID", placeholder: "Contoh: 1234" },
    ],
    items: [
      { id: "mc_10", name: "10 Diamonds", price: 3000, originalPrice: 3000, icon: "💎" },
      { id: "mc_50", name: "50 Diamonds", price: 14000, originalPrice: 14000, icon: "💎" },
      { id: "mc_100", name: "100 Diamonds", price: 27500, originalPrice: 27500, icon: "💎" },
      { id: "mc_500", name: "500 Diamonds", price: 135000, originalPrice: 135000, icon: "💎" },
    ],
  },
  "pubg-mobile": {
    name: "PUBG Mobile",
    developer: "Tencent",
    logo: "https://upload.wikimedia.org/wikipedia/en/b/be/PUBG_Mobile_Logo.png",
    cover: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236479-aqgje8ve-2.jpg?w=160&q=75",
    fields: [
      { id: "playerId", label: "Player ID", placeholder: "Contoh: 123456789" },
    ],
    items: [
      { id: "pubg_60", name: "60 UC", price: 14500, originalPrice: 14500, icon: "🪙" },
      { id: "pubg_325", name: "325 UC", price: 72500, originalPrice: 72500, icon: "🪙" },
      { id: "pubg_660", name: "660 UC", price: 145000, originalPrice: 145000, icon: "🪙" },
      { id: "pubg_1800", name: "1800 UC", price: 362500, originalPrice: 362500, icon: "🪙" },
    ],
  },
  "valorant": {
    name: "Valorant",
    developer: "Riot Games",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Valorant_logo.svg",
    cover: "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/fullportrait.png",
    fields: [
      { id: "riotId", label: "Riot ID (Username#Tag)", placeholder: "Contoh: Username#1234" },
    ],
    items: [
      { id: "val_125", name: "125 Valorant Points", price: 15000, originalPrice: 15000, icon: "🪙" },
      { id: "val_375", name: "375 Valorant Points", price: 45000, originalPrice: 45000, icon: "🪙" },
      { id: "val_650", name: "650 Valorant Points", price: 75000, originalPrice: 75000, icon: "🪙" },
      { id: "val_1350", name: "1350 Valorant Points", price: 150000, originalPrice: 150000, icon: "🪙" },
      { id: "val_2100", name: "2100 Valorant Points", price: 230000, originalPrice: 230000, icon: "🪙" },
      { id: "val_3600", name: "3600 Valorant Points", price: 380000, originalPrice: 380000, icon: "🪙" },
    ],
  },
  "free-fire": {
    name: "Free Fire",
    developer: "Garena",
    logo: "https://upload.wikimedia.org/wikipedia/en/b/b8/Garena_Free_Fire_Logo.png",
    cover: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236466-2bajaevq-5.jpg?w=160&q=75",
    fields: [
      { id: "playerId", label: "Player ID", placeholder: "Contoh: 1234567890" },
    ],
    items: [
      { id: "ff_5", name: "5 Diamonds", price: 1500, originalPrice: 1500, icon: "💎" },
      { id: "ff_12", name: "12 Diamonds", price: 2500, originalPrice: 2500, icon: "💎" },
      { id: "ff_70", name: "70 Diamonds", price: 10500, originalPrice: 10500, icon: "💎" },
      { id: "ff_140", name: "140 Diamonds", price: 20000, originalPrice: 20000, icon: "💎" },
      { id: "ff_355", name: "355 Diamonds", price: 50500, originalPrice: 50500, icon: "💎" },
      { id: "ff_720", name: "720 Diamonds", price: 99000, originalPrice: 99000, icon: "💎" },
    ],
  },
  "honor-of-kings": {
    name: "Honor Of Kings",
    developer: "Tencent",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Honor_of_Kings_logo.png",
    cover: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236481-ji77o8i6-3.jpg?w=160&q=75",
    fields: [
      { id: "playerId", label: "Player ID", placeholder: "Contoh: 1234567890" },
    ],
    items: [
      { id: "hok_8", name: "8 Tokens", price: 2000, originalPrice: 2000, icon: "🪙" },
      { id: "hok_88", name: "88 Tokens", price: 17500, originalPrice: 17500, icon: "🪙" },
      { id: "hok_257", name: "257 Tokens", price: 52000, originalPrice: 52000, icon: "🪙" },
      { id: "hok_432", name: "432 Tokens", price: 87000, originalPrice: 87000, icon: "🪙" },
    ],
  },
  "genshin-impact": {
    name: "Genshin Impact",
    developer: "HoYoverse",
    logo: "https://upload.wikimedia.org/wikipedia/en/5/5d/Genshin_Impact_logo.svg",
    cover: "https://sin1.contabostorage.com/20ab04d5e89c402888b2ba814feec970:xc-alk12091as-assets-10x129-empeshop/media/file-1746236471-s2qup57v-8.jpg?w=160&q=75",
    fields: [
      { id: "uid", label: "UID Player", placeholder: "Contoh: 812345678" },
      { id: "server", label: "Server", placeholder: "Contoh: Asia / America / Europe / TW_HK" },
    ],
    items: [
      { id: "genshin_blessing", name: "Blessing of the Welkin Moon", price: 79000, originalPrice: 79000, icon: "🌙" },
      { id: "genshin_60", name: "60 Genesis Crystals", price: 16000, originalPrice: 16000, icon: "🔮" },
      { id: "genshin_300", name: "300+30 Genesis Crystals", price: 79000, originalPrice: 79000, icon: "🔮" },
      { id: "genshin_980", name: "980+110 Genesis Crystals", price: 249000, originalPrice: 249000, icon: "🔮" },
      { id: "genshin_1980", name: "1980+260 Genesis Crystals", price: 479000, originalPrice: 479000, icon: "🔮" },
      { id: "genshin_3280", name: "3280+600 Genesis Crystals", price: 799000, originalPrice: 799000, icon: "🔮" },
    ],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { game } = await params;
  const data = GAME_DATA[game];

  if (!data) return { title: "Game tidak ditemukan" };

  return {
    title: `Top Up ${data.name} Termurah - Ryukomik`,
    description: `Beli diamond ${data.name} harga paling murah, proses otomatis 1 detik.`,
  };
}

export default async function TopupGamePage({ params }: PageProps) {
  const { game } = await params;
  const data = GAME_DATA[game];

  if (!data) notFound();

  return (
    <main className="rk-page rk-app-surface text-white">
      <TopupFormClient gameId={game} data={data} />
    </main>
  );
}
