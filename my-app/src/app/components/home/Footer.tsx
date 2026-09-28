tsx
"use client";

import { FOOTER_LINKS } from "@/app/constants/footerLinks";
import Link from "next/link";
import Container from "../global/Container";
import Icons from "../global/Icons";
import Wrapper from "../global/Wrapper";
import { Button } from "../ui/Button";
import { Particles } from "../ui/Particles";

const Footer = () => {
    return (
        <footer className="w-full py-10 relative">
            <Container>
                <Wrapper className="relative flex flex-col md:flex-row justify-between pb-20 overflow-hidden max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
                    <Particles
                        className="absolute inset-0 w-full -z-10"
                        quantity={40}
                        ease={10}
                        color="#0bc3a2"
                        refresh
                    />

                    <div className="flex flex-col items-start max-w-xs">
                        <div className="flex items-center gap-3">
                            <Icons.icon className="w-auto h-10" />
                            <span className="text-xl font-semibold text-foreground">
                                AptosPaylance
                            </span>
                        </div>

                        <p className="text-base mt-4 text-muted-foreground">
                            Empower your payroll with decentralized Web3 technology.
                        </p>

                        <Button className="mt-8" asChild>
                            <Link href="/create-company">
                                Get Started
                            </Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-2xl mt-10 md:mt-0">
                        {FOOTER_LINKS?.map((section, index) => (
                            <div
                                key={index}
                                className="flex flex-col gap-4"
                            >
                                <h4 className="text-sm font-semibold text-foreground">
                                    {section.title}
                                </h4>

                                <ul className="space-y-3 w-full">
                                    {section.links.map((link, linkIndex) => (
                                        <li
                                            key={linkIndex}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-all w-full"
                                        >
                                            <Link
                                                href={link.href}
                                                className="w-full"
                                            >
                                                {link.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Wrapper>
            </Container>

            <Container>
                <Wrapper className="pt-10 flex flex-col sm:flex-row items-center justify-between relative border-t border-border max-w-7xl mx-auto px-4 md:px-8 lg:px-12 gap-4">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} AptosPaylance. All rights reserved.
                    </p>

                    <div className="flex items-center gap-4">
                        <Link
                            href="https://twitter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1"
                        >
                            <Icons.twitter className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        </Link>

                        <Link
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1"
                        >
                            <Icons.instagram className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        </Link>

                        <Link
                            href="https://discord.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1"
                        >
                            <Icons.discord className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        </Link>
                    </div>
                </Wrapper>
            </Container>
        </footer>
    );
};

export default Footer;
```

This removes **all co-founder data** and also removes the now-unused `next/image` import.
