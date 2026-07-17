"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, useScroll, useTransform, useSpring, useMotionValue, MotionValue, AnimatePresence } from "framer-motion";
import PixelCard from "./PixelCard";

export interface CollectionItem {
    id: number;
    image: string;
    title: string;
    description?: string;
    tech?: string[];
}

export type CollectionSurferVariant = "magnetic" | "uplift" | "simple";

// Actual project items
const ITEMS: CollectionItem[] = [
    { 
        id: 1, 
        image: "/employee.jpeg", 
        title: "Employee Turnover Analytics", 
        description: "Performed extensive data analysis for turnover prediction at Portobello Tech. Implemented K‑means clustering, addressed class imbalance with SMOTE, and trained ML models. Gradient Boosting Classifier achieved the best AUC score. Designed customized retention programs for at‑risk employees.", 
        tech: ["Python", "Machine Learning", "K-Means", "SMOTE", "Gradient Boosting"] 
    },
    { 
        id: 2, 
        image: "/report.jpeg", 
        title: "AAL Clothing Sales Analysis", 
        description: "Examined Q4 2020 sales data across Australian states and customer segments. Identified key trends and provided strategic recommendations for personalized marketing, regional product tailoring, and e‑commerce initiatives.", 
        tech: ["Data Science", "Visualization", "Python"] 
    },
    { 
        id: 3, 
        image: "/rental.jpeg", 
        title: "Vehicle Rental Management System", 
        description: "Designed a full system for vehicle rentals handling customer registration, availability tracking, rental creation, and payments. Created use case, class, sequence, activity, and state machine diagrams.", 
        tech: ["UML", "System Design", "Requirements Analysis"] 
    },
    { 
        id: 4, 
        image: "/auth.jpeg", 
        title: "User Authentication System", 
        description: "Full‑stack authentication with registration, login, logout, and protected routes. Session management prevents unauthorized access to profile pages after logout.", 
        tech: ["Node.js", "SQL", "JavaScript"] 
    },
    { 
        id: 5, 
        image: "/weather.jpeg", 
        title: "Weather Finder", 
        description: "Weather application using the Weather API with search history displaying previous locations alongside current results.", 
        tech: ["JavaScript", "Weather API"] 
    },
    { 
        id: 6, 
        image: "/travel.jpeg", 
        title: "Travel Agency Page", 
        description: "Travel website featuring an image carousel on the homepage and dedicated contact page functionality.", 
        tech: ["HTML", "CSS", "JavaScript"] 
    }
];

interface CollectionSurferProps {
    items?: CollectionItem[];
    variant?: CollectionSurferVariant;
}

export function CollectionSurfer({ items = ITEMS, variant = "magnetic" }: CollectionSurferProps) {
    const duplicatedItems = [...items, ...items];
    const scrollPerItem = 600;
    const loopDistance = items.length * scrollPerItem;

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll({ container: scrollContainerRef });

    const smoothScroll = useSpring(scrollY, {
        mass: 0.1,
        stiffness: 100,
        damping: 20
    });

    const loopedProgress = useTransform(smoothScroll, (value) => value % loopDistance);

    const stepX = 240;
    const stepY = -84;
    const stepZ = -288;

    const x = useTransform(loopedProgress, [0, loopDistance], [0, -items.length * stepX]);
    const y = useTransform(loopedProgress, [0, loopDistance], [0, -items.length * stepY]);
    const z = useTransform(loopedProgress, [0, loopDistance], [0, -items.length * stepZ]);

    const mouseX = useMotionValue(-10000);
    const mouseY = useMotionValue(-10000);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (variant === "simple") return;
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
    };

    const handleMouseLeave = () => {
        if (variant === "simple") return;
        mouseX.set(-10000);
        mouseY.set(-10000);
    };

    const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div 
            ref={scrollContainerRef}
            className="relative w-full h-full text-white overflow-y-auto no-scrollbar"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
            <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
            
            {/* Scroll area: 50000px for pseudo-infinite scrolling */}
            <div style={{ height: "50000px" }} className="w-full">
                <div
                    className="sticky top-0 left-0 w-full h-[80vh] overflow-hidden flex items-center justify-center perspective-container"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="absolute top-[3vw] left-[3vw] z-50 pointer-events-none mix-blend-difference">
                        <h1 className="font-heading font-bold text-[clamp(2rem,6vw,5rem)] leading-[0.9] tracking-tighter">
                            PROJECTS
                            <span className="text-[0.4em] align-top relative top-[0.6em] ml-2 font-mono tabular-nums">
                                ({items.length})
                            </span>
                        </h1>
                    </div>

                    <div className="absolute bottom-[3vw] right-[3vw] z-50 font-mono text-xs tracking-wider uppercase opacity-70">
                        scroll to surf
                    </div>

                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                            perspective: "2000px",
                            perspectiveOrigin: "10% 10%",
                        }}
                    >
                        <motion.div
                            className="relative w-0 h-0"
                            style={{
                                x,
                                y,
                                z,
                                transformStyle: "preserve-3d",
                            }}
                        >
                            {duplicatedItems.map((item, i) => (
                                <Card
                                    key={`${item.id}-${i}`}
                                    item={item}
                                    i={i}
                                    stepX={stepX}
                                    stepY={stepY}
                                    stepZ={stepZ}
                                    mouseX={mouseX}
                                    mouseY={mouseY}
                                    scrollSpring={smoothScroll}
                                    variant={variant}
                                    onClick={() => setSelectedItem(item)}
                                />
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Modal for Detailed Project View via Portal */}
            {mounted && createPortal(
                <AnimatePresence>
                    {selectedItem && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                            onClick={() => setSelectedItem(null)}
                        >
                            <div onClick={(e) => e.stopPropagation()}>
                                <PixelCard variant="blue" className="w-[90vw] max-w-[600px] h-[500px] text-white">
                                    <div className="absolute inset-0 z-10 flex flex-col p-8 pointer-events-none">
                                        <div className="flex justify-between items-start mb-6">
                                            <h2 className="text-3xl font-bold">{selectedItem.title}</h2>
                                            <button 
                                                onClick={() => setSelectedItem(null)} 
                                                className="pointer-events-auto text-2xl text-white/50 hover:text-white transition"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <p className="text-lg mb-8 flex-1 text-gray-300 overflow-y-auto pointer-events-auto pr-4">
                                            {selectedItem.description}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {selectedItem.tech?.map(t => (
                                                <span key={t} className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-full text-sm font-medium">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </PixelCard>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

function Card({
    item,
    i,
    stepX,
    stepY,
    stepZ,
    mouseX,
    mouseY,
    scrollSpring,
    variant,
    onClick
}: {
    item: CollectionItem,
    i: number,
    stepX: number,
    stepY: number,
    stepZ: number,
    mouseX: MotionValue<number>,
    mouseY: MotionValue<number>,
    scrollSpring: MotionValue<number>,
    variant: CollectionSurferVariant,
    onClick: () => void
}) {
    const ref = useRef<HTMLDivElement>(null);

    const distance = useTransform([mouseX, mouseY, scrollSpring], ([x, y]) => {
        if (!ref.current || variant === "simple") return 200;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        return dist;
    });

    const targetScale = useTransform(distance, [0, 400], [1.5, 1]);
    const springScale = useSpring(targetScale, {
        mass: 0.5,
        stiffness: 300,
        damping: 20
    });

    const targetUplift = useTransform(distance, [0, 400], [-100, 0]);
    const springUplift = useSpring(targetUplift, {
        mass: 0.5,
        stiffness: 300,
        damping: 20
    });

    const transform = useTransform(
        [springScale, springUplift],
        ([s, u]) => {
            let scaleValue = 1;
            let upliftValue = 0;

            if (variant === "magnetic") {
                scaleValue = Number(s);
            } else if (variant === "uplift") {
                upliftValue = Number(u);
            }

            const baseX = i * stepX;
            const baseY = i * stepY;
            const baseZ = i * stepZ;

            return `translate3d(${baseX}px, ${baseY + upliftValue}px, ${baseZ}px) rotateY(-50deg) scale(${scaleValue})`;
        }
    );

    return (
        <motion.div
            ref={ref}
            onClick={onClick}
            className="absolute w-[300px] h-[400px] bg-neutral-900 overflow-hidden shadow-2xl transition-colors duration-500 ease-out group cursor-pointer"
            style={{
                transform,
                transformStyle: "preserve-3d",
            }}
        >
            <div className="absolute -top-6 -left-4 text-white font-mono text-xs opacity-50 transition-opacity group-hover:opacity-100">
                {String((i % 6) + 1).padStart(2, '0')}
            </div>

            <div className="relative w-full h-full brightness-75 group-hover:brightness-100 transition-all duration-300">
                <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 className="text-xl font-bold">{item.title}</h3>
            </div>
        </motion.div>
    );
}
