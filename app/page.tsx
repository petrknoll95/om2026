import AnimatedHeroText from "./components/AnimatedHeroText";

export default function Home() {
  return (
    <main>
      <section id="work" className="h-screen flex items-end justify-start p-8">
        <AnimatedHeroText
          text="The AI-native product studio for designing, building, and operationalizing intelligent software."
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium max-w-[28ch] text-left leading-[110%] text-pretty text-foreground/90"
          delay={0.5}
        />
      </section>
      <section id="manifest" className="h-screen flex items-center justify-center p-8">
        <h1 className="text-6xl font-medium">Manifest</h1>
      </section>
      <section id="contact" className="h-screen flex items-center justify-center p-8">
        <h1 className="text-6xl font-medium">Contact</h1>
      </section>
    </main>
  );
}
