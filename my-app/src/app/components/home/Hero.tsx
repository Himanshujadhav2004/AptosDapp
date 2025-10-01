"use client";

import Link from "next/link";
import { BlurText } from "../ui/BlurText";
import { Button } from "../ui/Button";
import Container from "../global/Container";
import { Particles } from "../ui/Particles";

const Hero = () => {
  return (
    <div className="flex flex-col items-center text-center w-full max-w-5xl my-24 mx-auto z-40 relative">
      <Particles
        className="absolute inset-0 -z-10"
        quantity={100}
        ease={50}
        color="#0bc3a2"
        refresh
      />
      <Container delay={0.0}>
        <div className="pl-2 pr-1 py-1 rounded-full border border-foreground/10 hover:border-foreground/15 backdrop-blur-lg cursor-pointer flex items-center gap-2.5 select-none w-max mx-auto">
          <div className="w-3.5 h-3.5 rounded-full bg-[rgba(11,195,162,0.4)] flex items-center justify-center relative">
            <div className="w-2.5 h-2.5 rounded-full bg-[rgba(11,195,162,0.6)] flex items-center justify-center animate-ping">
              <div className="w-2.5 h-2.5 rounded-full bg-[rgba(11,195,162,0.6)] flex items-center justify-center animate-ping"></div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[rgba(11,195,162,1)] flex items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            </div>
          </div>
          <span className="inline-flex items-center justify-center gap-2 animate-text-gradient animate-background-shine bg-gradient-to-r from-[rgba(11,195,162,0.8)] via-[rgba(11,195,162,1)] to-[rgba(11,195,162,0.6)] bg-[200%_auto] bg-clip-text text-sm text-transparent">
            Built on Aptos Blockchain
            <span className="text-xs text-secondary-foreground px-1.5 py-0.5 rounded-full bg-gradient-to-b from-foreground/20 to-foreground/10 flex items-center justify-center">
              Web3 Payroll
            </span>
          </span>
        </div>
      </Container>
      <BlurText
        word={"Decentralized Payroll\nSystem for Future"}
        className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent py-2 md:py-0 lg:!leading-snug font-medium tracking-[-0.0125em] mt-6 font-heading"
      />
      <Container delay={0.1}>
        <p className="text-sm sm:text-base lg:text-lg mt-4 text-accent-foreground/60 max-w-2xl mx-auto">
          Streamline your payroll operations with blockchain technology. <span className="hidden sm:inline">AptosPaylance is the all-in-one solution for decentralized employee payment management.</span>
        </p>
      </Container>
      <Container delay={0.2}>
        <div className="flex items-center justify-center md:gap-x-8 mt-8">
          <Button asChild size="lg">
            <Link href="/create-company">
              Get Started
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="hidden md:flex">
            <Link href="#workflow">
              How it works
            </Link>
          </Button>
        </div>
      </Container>
      <Container delay={0.3}>
        <div className="relative mx-auto max-w-7xl rounded-xl lg:rounded-[32px] border border-neutral-200/50 p-2 backdrop-blur-lg border-neutral-700 bg-neutral-800/50 md:p-4 mt-12">
          <div className="absolute top-1/4 left-1/2 -z-10 gradient w-3/4 -translate-x-1/2 h-1/4 -translate-y-1/2 inset-0 blur-[10rem]"></div>

          <div className="rounded-lg lg:rounded-[24px] border p-2 border-neutral-700 bg-black overflow-hidden">
            <video
              src="/hero.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="rounded-lg lg:rounded-[20px] w-full"
            />
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Hero;
