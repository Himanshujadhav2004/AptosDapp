"use client";

import React from "react";
import { Particles } from "./Particles";
import { cn } from "@/app/lib/utils";

export interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    particles?: boolean;
    count?: number;
    contentClassName?: string;
}

export default function MagicCard({
    children,
    particles = false,
    count = 20,
    className,
    contentClassName,
    ...props
}: MagicCardProps) {
    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { currentTarget } = e;
        const rect = currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentTarget.style.setProperty('--pos-x', `${x}px`);
        currentTarget.style.setProperty('--pos-y', `${y}px`);
    };

    return (
        <div 
            className={cn("card rounded-xl lg:rounded-2xl overflow-hidden", className)} 
            onMouseMove={onMouseMove} 
            style={{ pointerEvents: 'auto' } as React.CSSProperties}
            {...props}
        >
            <div className={cn("content relative", contentClassName)} style={{ pointerEvents: 'auto' } as React.CSSProperties}>
                {particles && (
                    <Particles
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        quantity={count}
                        ease={80}
                        color="#0bc3a2"
                        refresh
                    />
                )}
                <div className="relative z-10" style={{ pointerEvents: 'auto' } as React.CSSProperties}>
                    {children}
                </div>
            </div>
        </div>
    );
}
