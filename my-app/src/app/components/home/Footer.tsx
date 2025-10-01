"use client";

import { FOOTER_LINKS } from "@/app/constants/footerLinks";
import Link from "next/link";
import Image from "next/image";
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
                            <span className="text-xl font-semibold text-foreground">AptosPaylance</span>
                        </div>
                        <p className="text-base mt-4 text-muted-foreground">
                            Empower your payroll with decentralized Web3 technology.
                        </p>
                        <Button className="mt-8" asChild>
                            <Link href="/create-company">
                                Get Started
                            </Link>
                        </Button>
                        
                        {/* Co-Founders */}
                        <div className="mt-12 w-full">
                            <h4 className="text-sm font-semibold text-foreground mb-6">Co-Founders</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-64">
                                 {/* Himanshu Jadhav */}
                                 <div className="flex items-center gap-4 min-w-0">
                                    <div className="relative w-14 h-14 flex-shrink-0">
                                        <Image
                                            src="/images/himanshu.jpg"
                                            alt="Himanshu Jadhav"
                                            fill
                                            className="rounded-full object-cover border-2 border-primary/30"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-base font-semibold text-foreground whitespace-nowrap">Himanshu Jadhav</h5>
                                        <p className="text-sm text-muted-foreground mb-2 whitespace-nowrap">Co-Founder</p>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href="https://www.linkedin.com/in/himanshu-jadhav-66977425b/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group"
                                            >
                                                <div className="w-7 h-7 bg-secondary/50 hover:bg-primary/20 border border-border hover:border-primary/50 rounded-md flex items-center justify-center transition-all duration-300">
                                                    <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                                    </svg>
                                                </div>
                                            </Link>
                                            <Link
                                                href="https://x.com/0xhimanshujadhv"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group"
                                            >
                                                <div className="w-7 h-7 bg-secondary/50 hover:bg-primary/20 border border-border hover:border-primary/50 rounded-md flex items-center justify-center transition-all duration-300">
                                                    <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                                                    </svg>
                                                </div>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                 {/* Om Baviskar */}
                                 <div className="flex items-center gap-4 min-w-0">
                                    <div className="relative w-14 h-14 flex-shrink-0">
                                        <Image
                                            src="/images/om.png"
                                            alt="Om Baviskar"
                                            fill
                                            className="rounded-full object-cover border-2 border-primary/30"
                                        />
                                    </div>
                                     <div className="flex-1 min-w-0">
                                         <h5 className="text-base font-semibold text-foreground whitespace-nowrap">Om Baviskar</h5>
                                         <p className="text-sm text-muted-foreground mb-2 whitespace-nowrap">Co-Founder</p>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href="https://www.linkedin.com/in/om-baviskar-/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group"
                                            >
                                                <div className="w-7 h-7 bg-secondary/50 hover:bg-primary/20 border border-border hover:border-primary/50 rounded-md flex items-center justify-center transition-all duration-300">
                                                    <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                                    </svg>
                                                </div>
                                            </Link>
                                            <Link
                                                href="https://x.com/Om_Baviskar18"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group"
                                            >
                                                <div className="w-7 h-7 bg-secondary/50 hover:bg-primary/20 border border-border hover:border-primary/50 rounded-md flex items-center justify-center transition-all duration-300">
                                                    <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                                                    </svg>
                                                </div>
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                               
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-2xl mt-10 md:mt-0">
                        {FOOTER_LINKS?.map((section, index) => (
                            <div key={index} className="flex flex-col gap-4">
                                <h4 className="text-sm font-semibold text-foreground">
                                    {section.title}
                                </h4>
                                <ul className="space-y-3 w-full">
                                    {section.links.map((link, linkIndex) => (
                                        <li key={linkIndex} className="text-sm text-muted-foreground hover:text-foreground transition-all w-full">
                                            <Link href={link.href} className="w-full">
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
                        <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-1">
                            <Icons.twitter className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        </Link>
                        <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-1">
                            <Icons.instagram className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        </Link>
                        <Link href="https://discord.com" target="_blank" rel="noopener noreferrer" className="p-1">
                            <Icons.discord className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        </Link>
                    </div>
                </Wrapper>
            </Container>
        </footer>
    );
};

export default Footer;
