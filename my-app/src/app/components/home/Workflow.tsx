"use client";

import { cn } from "@/app/lib/utils";
import { 
  Wallet, 
  Building2, 
  Users, 
  Coins, 
  Send, 
  BarChart3,
  LucideIcon 
} from "lucide-react";
import Container from "../global/Container";
import { SectionBadge } from "../ui/SectionBadge";

const WORKFLOW_STEPS = [
  {
    title: "Connect Wallet",
    description: "Connect your Web3 wallet to access the decentralized Paylance platform and manage your Paylance securely.",
    icon: Wallet,
  },
  {
    title: "Create Paylance",
    description: "Set up your Paylance structure with custom parameters, payment schedules, and organizational details.",
    icon: Building2,
  },
  {
    title: "Add Employees",
    description: "Import or manually add employees to your Paylance system with their wallet addresses and salary details.",
    icon: Users,
  },
  {
    title: "Multi tokens with current price",
    description: "Make a payment using APT or USDC into Paylance to Employees with realtime value.",
    icon: Coins,
  },
  {
    title: "Bulk Pay or P2P",
    description: "Choose between bulk payments for efficiency or peer-to-peer transfers for individual employee payments.",
    icon: Send,
  },
  {
    title: "Get Analysis",
    description: "Access detailed analytics and reports on your Paylance expenses, transaction history, and financial insights.",
    icon: BarChart3,
  },
];

const Workflow = () => {
  return (
    <div id="workflow" className="flex flex-col items-center justify-center py-12 md:py-16 lg:py-24 w-full">
      <Container>
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto px-4">
          <SectionBadge title="How it works" />
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-heading font-medium !leading-snug mt-6">
            Workflow
          </h2>
          <p className="text-base md:text-lg text-center text-accent-foreground/80 mt-6">
            Step by Step Process to use AptosPaylance offers to streamline your payroll management
          </p>
        </div>
      </Container>
      <Container>
        <div className="mt-16 w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full relative">
            {WORKFLOW_STEPS.map((step, index) => (
              <WorkflowStep key={index} index={index} {...step} />
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
};

const WorkflowStep = ({
  title,
  description,
  icon: Icon,
  index,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r transform-gpu py-10 relative group/feature border-neutral-800",
        (index === 0 || index === 3) && "lg:border-l",
        index < 3 && "lg:border-b"
      )}
    >
      {index < 3 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-800 from-[rgba(11,195,162,0.15)] to-transparent pointer-events-none" />
      )}
      {index >= 3 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-800 from-[rgba(11,195,162,0.15)] to-transparent pointer-events-none" />
      )}
      <div className="group-hover/feature:-translate-y-1 transform-gpu transition-all duration-300 flex flex-col w-full">
        <div className="mb-4 relative z-10 px-10">
          <Icon strokeWidth={1.3} className="w-10 h-10 origin-left transform-gpu text-neutral-500 transition-all duration-300 ease-in-out group-hover/feature:scale-75 group-hover/feature:text-foreground" />
        </div>
        <div className="text-lg font-medium font-heading mb-2 relative z-10 px-10">
          <div className="absolute left-0 -inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-700 group-hover/feature:bg-[rgba(11,195,162,1)] transition-all duration-500 origin-center" />
          <span className="group-hover/feature:-translate-y-1 transition duration-500 inline-block heading">
            {title}
          </span>
        </div>
        <p className="text-sm text-neutral-300 max-w-xs relative z-10 px-10">
          {description}
        </p>
      </div>
    </div>
  );
};

export default Workflow;
