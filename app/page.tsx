"use client";

import { useRef, useEffect, useState, RefObject } from "react";
import ModelViewer from "@/components/ModelViewer";

/* ============================================
   Intersection Observer Hook for Fade-In
   ============================================ */
function useInView(ref: RefObject<HTMLElement | null>) {
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsInView(true);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return isInView;
}

/* ============================================
   Animated Section Wrapper
   ============================================ */
function Section({
  children,
  className = "",
  id = "",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref);
  return (
    <section
      ref={ref}
      id={id}
      className={`portfolio-section ${className} ${isInView ? "visible" : ""}`}
    >
      {children}
    </section>
  );
}

/* ============================================
   Portfolio Page
   ============================================ */
export default function Home() {
  return (
    <div className="portfolio">
      {/* 3D Model — Fixed Background Layer */}
      <ModelViewer />

      {/* Navigation */}
      <nav className="nav">
        <span className="nav-name">Devansh Taneja</span>
        <div className="nav-links">
          <a href="#experience">Experience</a>
          <a href="#projects">Projects</a>
          <a
            href="mailto:devanshtaneja1974@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Email
          </a>
          <a
            href="https://linkedin.com/in/devansh-taneja"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/Devansh-28"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Scrollable Content Overlay */}
      <div className="content-overlay">
        {/* ──────────── HERO ──────────── */}
        <Section className="hero-section" id="hero">
          <h1 className="hero-name">
            DEVANSH
            <br />
            TANEJA
          </h1>
          <p className="hero-subtitle">
            Computer Science &amp; Artificial Intelligence
          </p>
          <p className="hero-location">Edinburgh, United Kingdom</p>
          <div className="scroll-indicator">↓ Scroll to explore</div>
        </Section>

        {/* ──────────── EDUCATION ──────────── */}
        <Section id="education">
          <div className="card">
            <span className="section-label">Education</span>
            <h2 className="section-heading">Academic Journey</h2>

            <div className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-date">Expected May 2026</div>
              <div className="timeline-title">
                BSc (Hons) Computer Science
              </div>
              <div className="timeline-subtitle">
                Heriot Watt University · Edinburgh, UK
              </div>
              <div className="timeline-content">
                Major in Computer Science with Artificial Intelligence
                <br />
                GPA: 3.8 / 4.0
                <br />
                Coursework: Data Structures &amp; Algorithms, Software
                Engineering, Web Programming, Hardware‑Software Interface
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-date">2021 – 2023</div>
              <div className="timeline-title">Higher Senior Secondary</div>
              <div className="timeline-subtitle">
                Mount Carmel School · New Delhi, India
              </div>
              <div className="timeline-content">
                Class 12: 95% · Class 11: 95% · Class 10: 95.6%
              </div>
            </div>
          </div>
        </Section>

        {/* ──────────── SKILLS ──────────── */}
        <Section className="section-right" id="skills">
          <div className="card">
            <span className="section-label">Technical Skills</span>
            <h2 className="section-heading">What I Work With</h2>

            <div className="skills-group">
              <h3 className="skills-category">Languages</h3>
              <div className="skills-grid">
                {[
                  "HTML",
                  "CSS",
                  "JavaScript",
                  "Java",
                  "Python",
                  "C++",
                  "OCaml",
                  "SQL",
                ].map((s) => (
                  <span key={s} className="skill-pill">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="skills-group">
              <h3 className="skills-category">Libraries &amp; Frameworks</h3>
              <div className="skills-grid">
                {["Node.js", "jQuery", "Ajax", "XML", "JSON"].map((s) => (
                  <span key={s} className="skill-pill">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="skills-group">
              <h3 className="skills-category">Data Science &amp; ML</h3>
              <div className="skills-grid">
                {[
                  "Generative AI",
                  "Prompt Engineering",
                  "Machine Learning",
                  "Deep Learning",
                  "Data Science",
                ].map((s) => (
                  <span key={s} className="skill-pill">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ──────────── EXPERIENCE ──────────── */}
        <Section id="experience">
          <div className="card">
            <span className="section-label">Work Experience</span>
            <h2 className="section-heading">Where I&apos;ve Worked</h2>

            <div className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-date">Apr 2025 – Nov 2025</div>
              <div className="timeline-title">
                Full Stack, Interactive Systems &amp; Game Developer
              </div>
              <div className="timeline-subtitle">
                Pan Intellecom Ltd · Gurugram, India
              </div>
              <div className="timeline-content">
                <ul>
                  <li>
                    Created an interactive tabletop version of the Lothal
                    Museum, including game design, pieces, gameplay types, and
                    scoring technology
                  </li>
                  <li>
                    Updated the company website with new projects, case studies,
                    partners, and refined design quality across the board
                  </li>
                  <li>
                    Built interactive exhibits for the Parliament Museum project
                    integrating RFID readers, Hall‑effect sensors, rotary
                    encoders, and other embedded technologies
                  </li>
                </ul>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-date">May 2024 – Aug 2024</div>
              <div className="timeline-title">
                Full Stack Developer Intern
              </div>
              <div className="timeline-subtitle">
                Digiintern · New Delhi, India
              </div>
              <div className="timeline-content">
                <ul>
                  <li>Fixed production bugs across company websites</li>
                  <li>
                    Implemented UX/UI improvements and design refinements
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* ──────────── PROJECTS ──────────── */}
        <Section className="section-right" id="projects">
          <div className="card">
            <span className="section-label">Projects</span>
            <h2 className="section-heading">What I&apos;ve Built</h2>

            <div className="project-card">
              <h3>Employee Turnover Analytics</h3>
              <p>
                Performed extensive data analysis for turnover prediction at
                Portobello Tech. Implemented K‑means clustering, addressed
                class imbalance with SMOTE, and trained ML models. Gradient
                Boosting Classifier achieved the best AUC score. Designed
                customized retention programs for at‑risk employees.
              </p>
              <div className="project-tech">
                <span className="tech-tag">Python</span>
                <span className="tech-tag">Machine Learning</span>
                <span className="tech-tag">K‑Means</span>
                <span className="tech-tag">SMOTE</span>
                <span className="tech-tag">Gradient Boosting</span>
              </div>
            </div>

            <div className="project-card">
              <h3>AAL Clothing Sales Analysis</h3>
              <p>
                Examined Q4 2020 sales data across Australian states and
                customer segments. Identified key trends and provided strategic
                recommendations for personalized marketing, regional product
                tailoring, and e‑commerce initiatives.
              </p>
              <div className="project-tech">
                <span className="tech-tag">Data Science</span>
                <span className="tech-tag">Visualization</span>
                <span className="tech-tag">Python</span>
              </div>
            </div>

            <div className="project-card">
              <h3>Vehicle Rental Management System</h3>
              <p>
                Designed a full system for vehicle rentals handling customer
                registration, availability tracking, rental creation, and
                payments. Created use case, class, sequence, activity, and
                state machine diagrams.
              </p>
              <div className="project-tech">
                <span className="tech-tag">UML</span>
                <span className="tech-tag">System Design</span>
                <span className="tech-tag">Requirements Analysis</span>
              </div>
            </div>

            <div className="project-card">
              <h3>User Authentication System</h3>
              <p>
                Full‑stack authentication with registration, login, logout, and
                protected routes. Session management prevents unauthorized
                access to profile pages after logout.
              </p>
              <div className="project-tech">
                <span className="tech-tag">Node.js</span>
                <span className="tech-tag">SQL</span>
                <span className="tech-tag">JavaScript</span>
              </div>
            </div>

            <div className="project-card">
              <h3>Weather Finder</h3>
              <p>
                Weather application using the Weather API with search history
                displaying previous locations alongside current results.
              </p>
              <div className="project-tech">
                <span className="tech-tag">JavaScript</span>
                <span className="tech-tag">Weather API</span>
              </div>
            </div>

            <div className="project-card">
              <h3>Travel Agency Page</h3>
              <p>
                Travel website featuring an image carousel on the homepage and
                dedicated contact page functionality.
              </p>
              <div className="project-tech">
                <span className="tech-tag">HTML</span>
                <span className="tech-tag">CSS</span>
                <span className="tech-tag">JavaScript</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ──────────── CERTIFICATIONS ──────────── */}
        <Section id="certificates">
          <div className="card">
            <span className="section-label">Certifications</span>
            <h2 className="section-heading">Continuous Learning</h2>

            <div className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-date">October 2024</div>
              <div className="timeline-title">
                Post Graduate Program in AI &amp; Machine Learning
              </div>
              <div className="timeline-subtitle">
                Caltech CTME USA · via Simplilearn
              </div>
              <div className="timeline-content">
                Advanced AI/ML concepts including Generative AI, Deep Learning
                with TensorFlow. Hands‑on Capstone Project integrating
                real‑world AI challenges. Endorsed by Dr. Rick Hefner,
                Executive Director, Caltech CTME.
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-date">December 2024</div>
              <div className="timeline-title">Python for Data Science</div>
              <div className="timeline-subtitle">
                IBM Developer Skills Network · via Simplilearn
              </div>
              <div className="timeline-content">
                Python programming for data manipulation, analysis, and
                visualization. Powered by IBM.
              </div>
            </div>
          </div>
        </Section>

        {/* ──────────── CONTACT ──────────── */}
        <Section className="contact-section" id="contact">
          <div className="card">
            <span className="section-label">Get In Touch</span>
            <h2 className="section-heading">Let&apos;s Connect</h2>

            <div className="contact-links">
              <a
                href="mailto:devanshtaneja1974@gmail.com"
                className="contact-link"
              >
                <span className="contact-link-icon">✉</span>
                devanshtaneja1974@gmail.com
              </a>
              <a href="tel:+447760844410" className="contact-link">
                <span className="contact-link-icon">☎</span>
                +44 7760844410
              </a>
              <a href="tel:+917834840290" className="contact-link">
                <span className="contact-link-icon">☎</span>
                +91 7834840290
              </a>
              <a
                href="https://linkedin.com/in/devansh-taneja"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                <span className="contact-link-icon">↗</span>
                LinkedIn
              </a>
              <a
                href="https://github.com/Devansh-28"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                <span className="contact-link-icon">↗</span>
                GitHub
              </a>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <footer className="footer">
          © {new Date().getFullYear()} Devansh Taneja. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
