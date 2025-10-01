"use client";

import { cn } from "@/app/lib/utils";
import { CheckIcon } from "lucide-react";
import Link from "next/link";
import Container from "../global/Container";
import { Button } from "../ui/Button";
import { SectionBadge } from "../ui/SectionBadge";
import MagicCard from "../ui/MagicCard";

const PRICING_PLANS = [
  {
    id: "starter",
    title: "Starter",
    desc: "Perfect for small teams and startups",
    price: 0,
    buttonText: "Get Started",
    features: [
      "Up to 10 employees",
      "APT & USDC payments",
      "Basic analytics",
      "Email support",
      "Transaction history",
      "Priority support",
      "Bulk payments",
    ],
  },
  {
    id: "pro",
    title: "Professional",
    desc: "For growing businesses with advanced needs",
    price: 49,
    buttonText: "Start Free Trial",
    features: [
      "Unlimited employees",
      "Multi-token support",
      "Advanced analytics & reports",
      "Priority support",
      "Bulk payments",
      "Custom payment schedules",
      "API access",
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise",
    desc: "Custom solutions for large organizations",
    price: 199,
    buttonText: "Contact Sales",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom integrations",
      "On-chain compliance tools",
      "Multi-org management",
      "Advanced permissions",
      "SLA guarantee",
    ],
  },
];

const Pricing = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 lg:py-24 w-full relative">
      <Container>
        <div className="flex flex-col items-center text-center max-w-xl mx-auto">
          <SectionBadge title="Pricing" />
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-heading font-medium !leading-snug mt-6">
            Simple and transparent pricing
          </h2>
          <p className="text-base md:text-lg text-center text-accent-foreground/80 mt-6">
            Choose the plan that suits your needs. No hidden fees, no surprises.
          </p>
        </div>
      </Container>
      <div className="mt-8 w-full relative flex flex-col items-center justify-center">
        <div className="absolute hidden lg:block top-1/2 right-2/3 translate-x-1/4 -translate-y-1/2 w-96 h-96 bg-[rgba(11,195,162,0.15)] blur-[10rem] -z-10"></div>
        <div className="absolute hidden lg:block top-1/2 left-2/3 -translate-x-1/4 -translate-y-1/2 w-96 h-96 bg-[rgba(11,195,162,0.2)] blur-[10rem] -z-10"></div>
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-14 max-w-6xl mx-auto">
            {PRICING_PLANS.map((plan, index) => (
              <PricingCard key={index} index={index} {...plan} />
            ))}
          </div>
        </Container>
      </div>
    </div>
  );
};

const PricingCard = ({
  id,
  title,
  desc,
  price,
  buttonText,
  features,
  index,
}: {
  id: string;
  title: string;
  desc: string;
  price: number;
  buttonText: string;
  features: string[];
  index: number;
}) => {
  return (
    <MagicCard particles={true} className="bg-transparent opacity-80 w-full pricing-card" contentClassName="!bg-transparent">
      <div
        className={cn(
          "flex flex-col size-full border rounded-2xl relative p-3 [background-image:linear-gradient(345deg,rgba(255,255,255,0.01)_0%,rgba(255,255,255,0.03)_100%)]",
          id === "pro" ? "border-primary/80" : "border-border/60",
        )}
      >
        
        <div className="flex flex-col p-3 w-full">
          <h2 className="text-xl font-medium">
            {title}
          </h2>
          <p className="text-sm mt-2 text-muted-foreground break-words">
            {desc}
          </p>
        </div>
        <hr className="shrink-0 border-none w-full h-px bg-border" role="separator" />
        <div className="relative flex flex-col flex-1 align-top w-full p-3 h-full break-words text-left gap-4">
          <div className="flex items-end gap-2">
            <div className="flex items-end gap-1">
              <span className="text-3xl md:text-4xl font-bold">
                ${price}
              </span>
              <span className="text-lg text-muted-foreground font-medium">
                per month
              </span>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckIcon aria-hidden="true" className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm md:text-base text-muted-foreground">
                  {feature}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 mt-auto h-auto flex w-full items-center">
          <Button
            asChild
            variant={id === "pro" ? "default" : "tertiary"}
            className="w-full hover:scale-100 bg-secondary/10 hover:translate-y-0 shadow-none"
          >
            <Link href="/create-company">
              {buttonText}
            </Link>
          </Button>
        </div>
      </div>
    </MagicCard>
  );
};

export default Pricing;
