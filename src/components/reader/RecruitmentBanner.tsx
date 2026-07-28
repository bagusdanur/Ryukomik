const DISCORD_RECRUITMENT_URL = "https://discord.gg/Cy8cuhknac";

export default function RecruitmentBanner() {
  return (
    <a
      data-no-tap
      href={DISCORD_RECRUITMENT_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      aria-label="Gabung Discord Ryukomik untuk recruitment translator dan typesetter"
      className="group mx-auto my-7 block w-full max-w-[760px] overflow-hidden rounded-xl border border-violet-300/20 bg-[#0a0912] shadow-[0_18px_50px_rgba(0,0,0,.4)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/55 hover:shadow-[0_22px_58px_rgba(100,70,255,.28)] sm:rounded-2xl"
    >
      <img
        src="/recruitment-banner.jpg"
        alt="Ryukomik membuka recruitment Translator dan Typesetter. Klik untuk daftar via Discord."
        loading="lazy"
        decoding="async"
        className="block h-auto w-full transition duration-300 group-hover:scale-[1.01]"
      />
    </a>
  );
}
