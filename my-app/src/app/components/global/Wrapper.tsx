import { cn } from "@/app/lib/utils";
import React from "react";

interface WrapperProps {
  children: React.ReactNode;
  className?: string;
}

const Wrapper: React.FC<WrapperProps> = ({ children, className }) => {
  return (
    <div className={cn("w-full h-full mx-auto", className)}>
      {children}
    </div>
  );
};

export default Wrapper;
