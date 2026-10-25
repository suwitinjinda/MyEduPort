import React, { useState, useEffect } from "react";
import { apiFetch, loadSaved } from "../api/client";
import jsPDF from "jspdf";
import { fmtDate, fmtDateLong } from "../utils/date.js";

// ---------------- Portfolio report design system ----------------
// Three independent choices: color palette (each with a meaning), layout, and font pairing.
// Colors are RGB arrays for jsPDF. "accent" is the highlight color, "ink" the main text color.
export const PALETTES = {
  ivy:      { name: "Ivy Navy & Gold",  meaning: "Tradition · trust · achievement",      bestFor: "Classic top-university applications",     ink: [10, 31, 68],  accent: [201, 169, 97], paper: [250, 248, 243], rule: [200, 192, 165], inkSoft: [74, 88, 114] },
  emerald:  { name: "Emerald Scholar",  meaning: "Growth · balance · curiosity",         bestFor: "Science, environment, medicine",          ink: [6, 59, 50],   accent: [16, 163, 127], paper: [246, 251, 249], rule: [180, 214, 202], inkSoft: [61, 96, 88] },
  crimson:  { name: "Oxford Crimson",   meaning: "Passion · courage · determination",    bestFor: "Leadership, debate, athletics",           ink: [74, 14, 26],  accent: [178, 34, 52],  paper: [252, 248, 246], rule: [220, 190, 190], inkSoft: [107, 70, 76] },
  royal:    { name: "Royal Purple",     meaning: "Creativity · wisdom · ambition",       bestFor: "Arts, humanities, design",                ink: [46, 16, 101], accent: [139, 92, 246], paper: [250, 248, 255], rule: [209, 196, 240], inkSoft: [91, 78, 128] },
  ocean:    { name: "Ocean Blue",       meaning: "Calm · clarity · reliability",         bestFor: "Engineering, computer science, data",     ink: [12, 45, 87],  accent: [37, 99, 235],  paper: [246, 249, 255], rule: [190, 208, 235], inkSoft: [71, 92, 125] },
  sunrise:  { name: "Sunrise Amber",    meaning: "Energy · optimism · initiative",       bestFor: "Entrepreneurship, startups, community",   ink: [67, 37, 6],   accent: [217, 119, 6],  paper: [255, 251, 243], rule: [233, 210, 170], inkSoft: [113, 86, 52] },
  rose:     { name: "Rose Quartz",      meaning: "Empathy · care · community",           bestFor: "Social impact, health, education",        ink: [80, 22, 52],  accent: [219, 39, 119], paper: [255, 248, 251], rule: [236, 196, 215], inkSoft: [118, 76, 98] },
  graphite: { name: "Graphite",         meaning: "Focus · professionalism · precision",  bestFor: "Formal submissions, ATS-friendly",        ink: [24, 24, 27],  accent: [82, 82, 91],   paper: [255, 255, 255], rule: [212, 212, 216], inkSoft: [63, 63, 70] }
};

export const LAYOUTS = {
  classic: { name: "Classic", blurb: "Centered editorial cover, framed by a color band.", title: ["Portfolio", "Dossier"] },
  modern:  { name: "Modern",  blurb: "Bold side stripe and color-bar section headings.", title: ["Application", "Portfolio"] },
  minimal: { name: "Minimal", blurb: "White space, thin rules, quiet type — easy to scan.", title: ["Student", "Portfolio"] },
  bold:    { name: "Bold",    blurb: "Full-color cover with oversized title — stands out.", title: ["My", "Portfolio"] }
};

// jsPDF built-in families (no download needed): helvetica, times, courier
export const FONTS = {
  editorial: { name: "Editorial",    heading: "times",     body: "helvetica", css: ["Georgia, 'Times New Roman', serif", "Helvetica, Arial, sans-serif"], blurb: "Serif headings, clean sans body" },
  sans:      { name: "Modern Sans",  heading: "helvetica", body: "helvetica", css: ["Helvetica, Arial, sans-serif", "Helvetica, Arial, sans-serif"], blurb: "Crisp and contemporary throughout" },
  serif:     { name: "Classic Serif", heading: "times",    body: "times",     css: ["Georgia, 'Times New Roman', serif", "Georgia, 'Times New Roman', serif"], blurb: "Traditional, bookish, formal" },
  mono:      { name: "Typewriter",   heading: "courier",   body: "helvetica", css: ["'Courier New', Courier, monospace", "Helvetica, Arial, sans-serif"], blurb: "Technical character for STEM portfolios" }
};

const rgb = (c) => `rgb(${c.join(",")})`;

export default function ExportPortfolio() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [palette, setPalette] = useState("ivy");
  const [layout, setLayout] = useState("classic");
  const [font, setFont] = useState("editorial");
  const prefsReady = React.useRef(false);
  const [sections, setSections] = useState({
    academics: true,
    tests: true,
    activities: true,
    awards: true,
    personalStatement: true,
    documents: true
  });

  const [portfolioData, setPortfolioData] = useState(null);
  const [canExport, setCanExport] = useState(true);

  useEffect(() => {
    loadPortfolioData();
    // reopen with the student's last design choices
    loadSaved(["export_prefs"]).then((sv) => {
      const d = sv.export_prefs?.new?.draft;
      if (d) {
        if (PALETTES[d.palette]) setPalette(d.palette);
        if (LAYOUTS[d.layout]) setLayout(d.layout);
        if (FONTS[d.font]) setFont(d.font);
        if (d.sections) setSections((prev) => ({ ...prev, ...d.sections }));
      }
    }).finally(() => { prefsReady.current = true; });
  }, []);
  useEffect(() => {
    if (!prefsReady.current) return;
    apiFetch("/api/ai/saved/export_prefs", { method: "PUT", body: JSON.stringify({ scope: "new", draft: { palette, layout, font, sections } }) }).catch(() => {});
  }, [palette, layout, font, sections]);

  const loadPortfolioData = async () => {
    try {
      // Single PAID-gated bundle: the backend blocks free users here (403), so the
      // export is enforced server-side, not just by disabling the button.
      const b = await apiFetch("/api/students/me/export");
      setPortfolioData({
        user: b.user,
        profile: b.profile,
        academics: b.academics || [],
        tests: b.tests || [],
        activities: b.activities || [],
        awards: b.awards || [],
        documents: b.documents || [],
        essays: b.essays || []
      });
      setCanExport(true);
    } catch (err) {
      // 403 => not on a paid plan; show the upgrade card instead of data.
      setCanExport(false);
      if (!String(err?.message || "").toLowerCase().includes("paid")) {
        console.error("Failed to load portfolio data:", err);
      }
    }
  };

  const toggle = (key) => () => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const generatePDF = async () => {
    if (!portfolioData) {
      setStatus("Loading portfolio data...");
      await loadPortfolioData();
      return;
    }

    setLoading(true);
    setStatus("Generating PDF...");

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      const rowHeight = 8; // Define rowHeight at top level for use in all sections
      let yPos = margin;

      // Helper function to add a new page if needed
      const checkPageBreak = (requiredHeight) => {
        if (yPos + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Track actual page numbers for TOC (will update after generation)
      let actualPageNumbers = {};

      // Editorial palette — driven by the selected template
      const P = PALETTES[palette] || PALETTES.ivy;
      const L = LAYOUTS[layout] || LAYOUTS.classic;
      const F = FONTS[font] || FONTS.editorial;
      const T = { title: L.title };
      const INK = P.ink;
      const GOLD = P.accent;
      const PAPER = P.paper;
      const RULE = P.rule;
      const INK_SOFT = P.inkSoft;
      const HF = F.heading; // heading font family
      const BF = F.body;    // body font family

      // Helper function to draw a line
      const drawLine = (y, color = RULE) => {
        doc.setDrawColor(...color);
        doc.line(margin, y, pageWidth - margin, y);
      };

      // Section heading — gold rule + navy serif
      const sectionHead = (num, title) => {
        const n = String(num).padStart(2, "0");
        if (layout === "modern") {
          doc.setFillColor(...INK);
          doc.rect(margin, yPos - 2, contentWidth, 13, "F");
          doc.setFillColor(...GOLD);
          doc.rect(margin, yPos - 2, 13, 13, "F");
          doc.setFont(HF, "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
          doc.text(n, margin + 6.5, yPos + 6.5, { align: "center" });
          doc.setFontSize(15);
          doc.text(title, margin + 18, yPos + 6.8);
          yPos += 22;
        } else if (layout === "minimal") {
          doc.setFont(BF, "normal"); doc.setFontSize(9); doc.setTextColor(...INK_SOFT);
          doc.text(`SECTION ${n}`, margin, yPos, { charSpace: 0.8 });
          yPos += 8;
          doc.setFont(HF, "bold"); doc.setFontSize(18); doc.setTextColor(...INK);
          doc.text(title, margin, yPos);
          yPos += 4;
          doc.setDrawColor(...RULE); doc.setLineWidth(0.2);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 10;
        } else if (layout === "bold") {
          doc.setFillColor(...GOLD);
          doc.circle(margin + 6, yPos + 3, 6, "F");
          doc.setFont(HF, "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
          doc.text(n, margin + 6, yPos + 4.6, { align: "center" });
          doc.setFontSize(22); doc.setTextColor(...INK);
          doc.text(title, margin + 16, yPos + 5.5);
          yPos += 12;
          doc.setDrawColor(...GOLD); doc.setLineWidth(1.2);
          doc.line(margin, yPos, margin + 40, yPos);
          doc.setLineWidth(0.2); doc.setDrawColor(...RULE);
          yPos += 10;
        } else {
          // classic — accent number, serif title, short accent rule
          doc.setDrawColor(...INK);
          doc.setLineWidth(0.6);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          doc.setLineWidth(0.2);
          yPos += 6;
          doc.setFontSize(10);
          doc.setFont(HF, "bold");
          doc.setTextColor(...GOLD);
          doc.text(n, margin, yPos);
          doc.setFontSize(20);
          doc.setTextColor(...INK);
          doc.text(title, margin + 12, yPos);
          yPos += 8;
          doc.setDrawColor(...GOLD);
          doc.line(margin + 12, yPos, margin + 30, yPos);
          doc.setDrawColor(...RULE);
          yPos += 10;
        }
        doc.setTextColor(...INK);
      };

      // ========== PAGE 1: COVER PAGE ==========
      const studentName = portfolioData.user?.name || portfolioData.profile?.name || "Student";
      const currentDate = fmtDateLong(new Date());
      const major = (portfolioData.profile?.intended_major || "").split(",")[0].trim();

      if (layout === "modern") {
        doc.setFillColor(...PAPER); doc.rect(0, 0, pageWidth, pageHeight, "F");
        doc.setFillColor(...INK); doc.rect(0, 0, 62, pageHeight, "F");
        doc.setFillColor(...GOLD); doc.rect(62, 0, 3, pageHeight, "F");
        doc.setFont(BF, "bold"); doc.setFontSize(9); doc.setTextColor(...GOLD);
        doc.text("MYEDUPORT", 14, 30, { charSpace: 1.2 });
        doc.setFont(HF, "normal"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
        doc.text(doc.splitTextToSize("Portfolio report prepared with the Excellent Portfolio Guide.", 40), 14, 40);
        let y = 120;
        doc.setFont(BF, "bold"); doc.setFontSize(10); doc.setTextColor(...GOLD);
        doc.text("PORTFOLIO REPORT", 80, y, { charSpace: 1 });
        y += 18; doc.setFont(HF, "bold"); doc.setFontSize(38); doc.setTextColor(...INK);
        doc.text(T.title[0], 80, y); y += 15; doc.text(T.title[1], 80, y);
        y += 16; doc.setDrawColor(...GOLD); doc.setLineWidth(1); doc.line(80, y, 120, y); doc.setLineWidth(0.2);
        y += 14; doc.setFont(HF, "normal"); doc.setFontSize(16); doc.setTextColor(...INK_SOFT);
        doc.text(studentName, 80, y);
        if (major) { y += 8; doc.setFontSize(11); doc.text(`Intended major: ${major}`, 80, y); }
        doc.setFont(BF, "normal"); doc.setFontSize(9); doc.setTextColor(...INK_SOFT);
        doc.text(currentDate, 80, pageHeight - 20);
      } else if (layout === "minimal") {
        doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageWidth, pageHeight, "F");
        doc.setFont(BF, "normal"); doc.setFontSize(9); doc.setTextColor(...INK_SOFT);
        doc.text("MyEduPort · Portfolio Report", margin, 30);
        doc.text(currentDate, pageWidth - margin, 30, { align: "right" });
        doc.setDrawColor(...RULE); doc.line(margin, 34, pageWidth - margin, 34);
        let y = 120;
        doc.setFont(HF, "bold"); doc.setFontSize(32); doc.setTextColor(...INK);
        doc.text(`${T.title[0]} ${T.title[1]}`, margin, y);
        y += 12; doc.setFont(HF, "normal"); doc.setFontSize(16); doc.setTextColor(...INK_SOFT);
        doc.text(studentName, margin, y);
        if (major) { y += 8; doc.setFontSize(11); doc.text(major, margin, y); }
        doc.setFillColor(...GOLD); doc.rect(margin, y + 10, 12, 1.2, "F");
      } else if (layout === "bold") {
        doc.setFillColor(...INK); doc.rect(0, 0, pageWidth, pageHeight, "F");
        doc.setFillColor(...GOLD); doc.rect(0, pageHeight - 70, pageWidth, 70, "F");
        doc.setFont(BF, "bold"); doc.setFontSize(10); doc.setTextColor(...GOLD);
        doc.text("MYEDUPORT · PORTFOLIO REPORT", margin, 30, { charSpace: 1.2 });
        let y = 95;
        doc.setFont(HF, "bold"); doc.setFontSize(54); doc.setTextColor(255, 255, 255);
        doc.text(T.title[0], margin, y); y += 22; doc.text(T.title[1], margin, y);
        doc.setFont(HF, "bold"); doc.setFontSize(22); doc.setTextColor(...INK);
        doc.text(studentName, margin, pageHeight - 42);
        doc.setFont(BF, "normal"); doc.setFontSize(11);
        doc.text([major ? `Intended major: ${major}` : "", currentDate].filter(Boolean).join("   ·   "), margin, pageHeight - 30);
      } else {
        // classic — centered editorial cover
        doc.setFillColor(...PAPER);
        doc.rect(0, 0, pageWidth, pageHeight, "F");
        doc.setFillColor(...GOLD);
        doc.rect(0, 0, pageWidth, 4, "F");
        doc.setFillColor(...INK);
        doc.rect(0, pageHeight - 30, pageWidth, 30, "F");
        yPos = 55;
        doc.setFontSize(9);
        doc.setFont(BF, "bold");
        doc.setTextColor(...GOLD);
        doc.text("THE EXCELLENT PORTFOLIO GUIDE", pageWidth / 2, yPos, { align: "center", charSpace: 1 });
        yPos += 14;
        doc.setFontSize(28);
        doc.setFont(HF, "bold");
        doc.setTextColor(...INK);
        doc.text("MyEduPort", pageWidth / 2, yPos, { align: "center" });
        yPos += 8;
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(0.8);
        doc.line(pageWidth / 2 - 15, yPos, pageWidth / 2 + 15, yPos);
        doc.setLineWidth(0.2);
        yPos += 22;
        doc.setFontSize(36);
        doc.setFont(HF, "bold");
        doc.text(T.title[0], pageWidth / 2, yPos, { align: "center" });
        yPos += 14;
        doc.text(T.title[1], pageWidth / 2, yPos, { align: "center" });
        yPos += 22;
        doc.setFontSize(16);
        doc.setFont(HF, "italic");
        doc.setTextColor(...INK_SOFT);
        doc.text(`for ${studentName}`, pageWidth / 2, yPos, { align: "center" });
        doc.setFontSize(8);
        doc.setFont(BF, "bold");
        doc.setTextColor(...GOLD);
        doc.text("PREPARED", margin, pageHeight - 18, { charSpace: 1 });
        doc.setFontSize(11);
        doc.setFont(HF, "normal");
        doc.setTextColor(...PAPER);
        doc.text(currentDate, margin, pageHeight - 11);
        doc.setFontSize(8);
        doc.setFont(BF, "bold");
        doc.setTextColor(...GOLD);
        doc.text("STUDENT", pageWidth - margin, pageHeight - 18, { align: "right", charSpace: 1 });
        doc.setFontSize(11);
        doc.setFont(HF, "normal");
        doc.setTextColor(...PAPER);
        doc.text(studentName, pageWidth - margin, pageHeight - 11, { align: "right" });
      }

      // Reset text color to default for subsequent pages
      doc.setTextColor(...INK);

      // ========== PAGE 2: TABLE OF CONTENTS ==========
      doc.addPage();
      yPos = margin + 10;

      doc.setFontSize(9);
      doc.setFont(BF, "bold");
      doc.setTextColor(...GOLD);
      doc.text("CONTENTS", pageWidth / 2, yPos, { align: "center", charSpace: 1 });
      yPos += 8;
      doc.setFontSize(26);
      doc.setFont(HF, "bold");
      doc.setTextColor(...INK);
      doc.text("Table of Contents", pageWidth / 2, yPos, { align: "center" });

      yPos += 6;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.6);
      doc.line(pageWidth / 2 - 15, yPos, pageWidth / 2 + 15, yPos);
      doc.setLineWidth(0.2);
      doc.setDrawColor(...RULE);
      yPos += 18;

      const tocItems = [];
      let pageNum = 3; // Start from page 3 (after cover and TOC)

      if (sections.academics) {
        tocItems.push({ title: "1. Academics", page: pageNum });
        pageNum++;
      }
      if (sections.tests) {
        tocItems.push({ title: "2. Standardized Test Scores", page: pageNum });
        pageNum++;
      }
      if (sections.activities) {
        tocItems.push({ title: "3. Extracurricular Activities", page: pageNum });
        pageNum++;
      }
      if (sections.awards) {
        tocItems.push({ title: "4. Awards & Achievements", page: pageNum });
        pageNum++;
      }
      if (sections.personalStatement) {
        tocItems.push({ title: "5. Personal Statement", page: pageNum });
        pageNum++;
      }
      if (sections.documents) {
        tocItems.push({ title: "6. Uploaded Documents", page: pageNum });
        pageNum++;
      }

      doc.setFontSize(12);
      doc.setFont(HF, "normal");
      doc.setTextColor(...INK_SOFT);
      tocItems.forEach((item) => {
        doc.text(item.title, margin, yPos);
        const dots = ". ".repeat(40);
        doc.setTextColor(...RULE);
        doc.text(dots, margin + doc.getTextWidth(item.title) + 3, yPos);
        doc.setTextColor(...INK);
        doc.setFont(HF, "bold");
        doc.text(String(item.page), pageWidth - margin, yPos, { align: "right" });
        doc.setFont(HF, "normal");
        doc.setTextColor(...INK_SOFT);
        yPos += 10;
      });
      doc.setTextColor(...INK);

      // ========== PAGE 3+: CONTENT SECTIONS ==========
      let currentPage = 3;

      // 1. Academics Section
      if (sections.academics && portfolioData.academics.length > 0) {
        doc.addPage();
        yPos = margin;
        currentPage++;

        sectionHead(1, "Academics");

        // Academic Records Table
        const tableTop = yPos;
        const colWidths = [30, 60, 40, 40];
        const headers = ["Year", "Course", "Level", "Grade"];

        // Table Header
        doc.setFillColor(...INK);
        doc.rect(margin, yPos, contentWidth, rowHeight, "F");
        doc.setFontSize(9);
        doc.setFont(BF, "bold");
        doc.setTextColor(...PAPER);
        let xPos = margin + 5;
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos + 6);
          xPos += colWidths[i];
        });
        yPos += rowHeight;
        doc.setTextColor(...INK_SOFT);
        drawLine(yPos);

        // Table Rows
        doc.setFont(BF, "normal");
        portfolioData.academics.forEach((record) => {
          checkPageBreak(rowHeight + 5);
          yPos += 2;
          xPos = margin + 5;
          const rowData = [
            record.year || "-",
            record.course || "-",
            record.level || "-",
            record.grade || "-"
          ];
          rowData.forEach((cell, i) => {
            const cellText = doc.splitTextToSize(String(cell), colWidths[i] - 5);
            doc.text(cellText, xPos, yPos + 6);
            xPos += colWidths[i];
          });
          yPos += rowHeight;
          drawLine(yPos);
        });
      }

      // 2. Standardized Test Scores
      if (sections.tests && portfolioData.tests.length > 0) {
        checkPageBreak(40);
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = margin;
        } else {
          yPos += 20;
        }

        sectionHead(2, "Standardized Test Scores");

        const testTableTop = yPos;
        const testColWidths = [50, 40, 40, 50];
        const testHeaders = ["Test Name", "Score", "Date", "Notes"];

        // Test Scores Table Header
        doc.setFillColor(...INK);
        doc.rect(margin, yPos, contentWidth, rowHeight, "F");
        doc.setFontSize(9);
        doc.setFont(BF, "bold");
        doc.setTextColor(...PAPER);
        let xPos = margin + 5;
        testHeaders.forEach((header, i) => {
          doc.text(header, xPos, yPos + 6);
          xPos += testColWidths[i];
        });
        yPos += rowHeight;
        drawLine(yPos);

        // Test Scores Table Rows
        doc.setFont(BF, "normal");
        portfolioData.tests.forEach((test) => {
          checkPageBreak(rowHeight + 5);
          yPos += 2;
          xPos = margin + 5;
          const rowData = [
            test.test_name || "-",
            test.score ? `${test.score}${test.max_score ? `/${test.max_score}` : ""}` : "-",
            test.test_date || "-",
            test.notes || "-"
          ];
          rowData.forEach((cell, i) => {
            const cellText = doc.splitTextToSize(String(cell), testColWidths[i] - 5);
            doc.text(cellText, xPos, yPos + 6);
            xPos += testColWidths[i];
          });
          yPos += rowHeight;
          drawLine(yPos);
        });
      }

      // 3. Extracurricular Activities
      if (sections.activities && portfolioData.activities.length > 0) {
        checkPageBreak(50);
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = margin;
        } else {
          yPos += 20;
        }

        sectionHead(3, "Extracurricular Activities");

        doc.setFontSize(11);
        doc.setFont(BF, "normal");
        portfolioData.activities.forEach((activity, index) => {
          checkPageBreak(30);
          doc.setFont(BF, "bold");
          doc.text(`${index + 1}. ${activity.title || "Activity"}`, margin, yPos);
          yPos += 7;

          doc.setFont(BF, "normal");
          if (activity.role) {
            doc.text(`Role: ${activity.role}`, margin + 5, yPos);
            yPos += 6;
          }
          if (activity.organization) {
            doc.text(`Organization: ${activity.organization}`, margin + 5, yPos);
            yPos += 6;
          }
          if (activity.start_date || activity.end_date) {
            const dateRange = `${activity.start_date || ""} - ${activity.end_date || "Present"}`;
            doc.text(`Duration: ${dateRange}`, margin + 5, yPos);
            yPos += 6;
          }
          if (activity.hours_per_week) {
            doc.text(`Hours per week: ${activity.hours_per_week}`, margin + 5, yPos);
            yPos += 6;
          }
          if (activity.description) {
            const descLines = doc.splitTextToSize(activity.description, contentWidth - 10);
            doc.text(descLines, margin + 5, yPos);
            yPos += descLines.length * 5;
          }
          yPos += 5;
        });
      }

      // 4. Awards & Achievements
      if (sections.awards && portfolioData.awards.length > 0) {
        checkPageBreak(50);
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = margin;
        } else {
          yPos += 20;
        }

        sectionHead(4, "Awards & Achievements");

        doc.setFontSize(11);
        doc.setFont(BF, "normal");
        portfolioData.awards.forEach((award, index) => {
          checkPageBreak(25);
          doc.setFont(BF, "bold");
          doc.text(`${index + 1}. ${award.title || "Award"}`, margin, yPos);
          yPos += 7;

          doc.setFont(BF, "normal");
          if (award.issuer) {
            doc.text(`Issuer: ${award.issuer}`, margin + 5, yPos);
            yPos += 6;
          }
          if (award.date) {
            doc.text(`Date: ${award.date}`, margin + 5, yPos);
            yPos += 6;
          }
          if (award.description) {
            const descLines = doc.splitTextToSize(award.description, contentWidth - 10);
            doc.text(descLines, margin + 5, yPos);
            yPos += descLines.length * 5;
          }
          yPos += 5;
        });
      }

      // 5. Personal Statement
      if (sections.personalStatement) {
        checkPageBreak(50);
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = margin;
        } else {
          yPos += 20;
        }

        sectionHead(5, "Personal Statement");

        const bio = portfolioData.profile?.bio || "";
        if (bio) {
          doc.setFontSize(11);
          doc.setFont(BF, "normal");
          const bioLines = doc.splitTextToSize(bio, contentWidth);
          doc.text(bioLines, margin, yPos);
          yPos += bioLines.length * 5;
        } else {
          doc.setFontSize(11);
          doc.setFont(BF, "italic");
          doc.setTextColor(150, 150, 150);
          doc.text("No personal statement provided.", margin, yPos);
          doc.setTextColor(0, 0, 0);
        }
      }

      // 6. Uploaded Documents
      if (sections.documents && portfolioData.documents.length > 0) {
        checkPageBreak(50);
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = margin;
        } else {
          yPos += 20;
        }

        sectionHead(6, "Uploaded Documents");

        doc.setFontSize(11);
        doc.setFont(BF, "normal");
        portfolioData.documents.forEach((document, index) => {
          checkPageBreak(15);
          const docName = document.original_name || document.filename || document.original_filename || `Document ${index + 1}`;
          const docType = document.category || "General";
          doc.text(`${index + 1}. ${docName} (${docType})`, margin, yPos);
          yPos += 8;
        });
      }

      // Save PDF
      const fileName = `Portfolio_${P.name.replace(/\W+/g, "_")}_${L.name}_${studentName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      setStatus("PDF exported successfully!");
      setLoading(false);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      console.error("PDF generation error:", err);
      setStatus(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const labelFor = (k) =>
    k === "personalStatement" ? "Personal Statement"
    : k === "tests" ? "Standardized Test Scores"
    : k.charAt(0).toUpperCase() + k.slice(1);

  return (
    <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Portfolio Report</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Generate your portfolio report.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "56ch" }}>
          A clean, print-ready PDF you can attach to applications,
          share with counselors, or hand to a parent.
        </p>
      </header>

      {/* Design studio: palette · layout · font, with a live cover preview */}
      <section className="card export-studio" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
        <div>
          <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.35rem" }}>Design your report</h2>
          <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>Pick a color story, a layout and a font. The preview updates as you choose — your choices are saved.</p>

          <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.6rem" }}>1 · Color palette — what your colors say</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "0.6rem", marginBottom: "1.75rem" }}>
            {Object.entries(PALETTES).map(([key, c]) => {
              const active = palette === key;
              return (
                <button key={key} type="button" onClick={() => setPalette(key)} aria-pressed={active}
                  style={{ textAlign: "left", cursor: "pointer", padding: "0.75rem 0.85rem", borderRadius: "var(--r-md)", fontFamily: "inherit", border: active ? `2px solid ${rgb(c.accent)}` : "1px solid var(--rule)", background: active ? "var(--surface-warm)" : "var(--surface)" }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: "0.45rem" }}>
                    {[c.ink, c.accent, c.inkSoft, c.paper].map((col, i) => (
                      <span key={i} style={{ width: 20, height: 20, borderRadius: 4, background: rgb(col), border: i === 3 ? "1px solid var(--rule)" : "none" }} />
                    ))}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)" }}>{c.name}{active ? " ✓" : ""}</div>
                  <div style={{ fontSize: "0.78rem", color: rgb(c.accent), fontWeight: 600, marginTop: "0.15rem" }}>{c.meaning}</div>
                  <div className="muted" style={{ fontSize: "0.74rem", marginTop: "0.15rem" }}>Great for: {c.bestFor}</div>
                </button>
              );
            })}
          </div>

          <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.6rem" }}>2 · Layout</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.6rem", marginBottom: "1.75rem" }}>
            {Object.entries(LAYOUTS).map(([key, l]) => {
              const active = layout === key;
              return (
                <button key={key} type="button" onClick={() => setLayout(key)} aria-pressed={active}
                  style={{ textAlign: "left", cursor: "pointer", padding: "0.7rem", borderRadius: "var(--r-md)", fontFamily: "inherit", border: active ? "2px solid var(--gold-deep)" : "1px solid var(--rule)", background: active ? "var(--surface-warm)" : "var(--surface)" }}>
                  <div style={{ width: 60, margin: "0 auto 0.5rem" }}><CoverPreview layout={key} palette={PALETTES[palette]} font={FONTS[font]} name="" tiny /></div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--ink)" }}>{l.name}{active ? " ✓" : ""}</div>
                  <div className="muted" style={{ fontSize: "0.74rem", marginTop: "0.15rem" }}>{l.blurb}</div>
                </button>
              );
            })}
          </div>

          <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.6rem" }}>3 · Font</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.6rem" }}>
            {Object.entries(FONTS).map(([key, f]) => {
              const active = font === key;
              return (
                <button key={key} type="button" onClick={() => setFont(key)} aria-pressed={active}
                  style={{ textAlign: "left", cursor: "pointer", padding: "0.75rem 0.85rem", borderRadius: "var(--r-md)", border: active ? "2px solid var(--gold-deep)" : "1px solid var(--rule)", background: active ? "var(--surface-warm)" : "var(--surface)" }}>
                  <div style={{ fontFamily: f.css[0], fontWeight: 700, fontSize: "1.15rem", color: "var(--ink)" }}>Aa Portfolio</div>
                  <div style={{ fontFamily: f.css[1], fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "0.15rem" }}>Body text sample 123</div>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--ink)", marginTop: "0.45rem", fontFamily: "inherit" }}>{f.name}{active ? " ✓" : ""}</div>
                  <div className="muted" style={{ fontSize: "0.72rem", fontFamily: "inherit" }}>{f.blurb}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="export-preview">
          <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.6rem" }}>Live preview</div>
          <CoverPreview layout={layout} palette={PALETTES[palette]} font={FONTS[font]} name={portfolioData?.user?.name || "Your Name"} major={(portfolioData?.profile?.intended_major || "").split(",")[0].trim()} />
          <div style={{ marginTop: "0.75rem", padding: "0.7rem 0.85rem", borderRadius: "var(--r-md)", background: rgb(PALETTES[palette].paper), border: "1px solid var(--rule)" }}>
            <SectionPreview layout={layout} palette={PALETTES[palette]} font={FONTS[font]} />
          </div>
          <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.6rem" }}>
            <strong style={{ color: rgb(PALETTES[palette].accent) }}>{PALETTES[palette].name}:</strong> {PALETTES[palette].meaning.toLowerCase()}.
          </p>
        </div>
      </section>

      <section className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>Sections to include</h2>
        <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Toggle the portfolio sections you want in the exported PDF.
        </p>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {Object.entries(sections).map(([key, value]) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                cursor: "pointer",
                padding: "0.85rem 1rem",
                border: "1px solid var(--rule)",
                background: value ? "var(--surface-warm)" : "var(--surface)",
                borderLeft: value ? "2px solid var(--gold)" : "1px solid var(--rule)",
                transition: "all 0.15s ease"
              }}
            >
              <input
                type="checkbox"
                checked={value}
                onChange={toggle(key)}
                style={{ width: "16px", height: "16px", accentColor: "var(--gold-deep)" }}
              />
              <span style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--ink)" }}>{labelFor(key)}</span>
            </label>
          ))}
        </div>
      </section>

      {status && (
        <div
          className="card compact"
          style={{
            marginBottom: "1.5rem",
            borderLeft: `2px solid ${status.toLowerCase().includes("error") ? "var(--error)" : "var(--success)"}`,
            background: status.toLowerCase().includes("error") ? "var(--error-soft)" : "var(--success-soft)"
          }}
        >
          <p
            style={{
              margin: 0,
              color: status.toLowerCase().includes("error") ? "var(--error)" : "var(--success)",
              fontWeight: 600,
              fontSize: "0.9rem"
            }}
          >
            {status}
          </p>
        </div>
      )}

      {!canExport && (
        <div className="card compact" style={{ marginBottom: "1rem", borderLeft: "3px solid var(--gold)", background: "var(--surface-warm)" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>PDF export is a paid feature.</p>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>Upgrade to Essential or Professional to download your Portfolio Report.</p>
        </div>
      )}
      <button className="button" onClick={generatePDF} disabled={loading || !portfolioData || !canExport} style={{ width: "100%", padding: "1rem" }}>
        {loading ? "Generating PDF…" : canExport ? "Download Portfolio Report (PDF) →" : "Upgrade to export"}
      </button>

      {!portfolioData && (
        <p className="muted" style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.88rem" }}>
          Loading portfolio data…
        </p>
      )}
    </div>
  );
}

// CSS mock of the PDF cover for the chosen layout / palette / font (A4 ratio)
function CoverPreview({ layout, palette: c, font: f, name, major, tiny }) {
  const L = LAYOUTS[layout];
  const H = f.css[0];
  const B = f.css[1];
  const s = (n) => (tiny ? n * 0.22 : n); // scale font sizes for the tiny thumbnails
  const base = { position: "relative", width: "100%", aspectRatio: "210 / 297", overflow: "hidden", borderRadius: tiny ? 3 : 8, boxShadow: tiny ? "none" : "0 8px 24px rgba(15,23,42,0.18)", border: "1px solid var(--rule)" };
  if (layout === "modern") {
    return (
      <div style={{ ...base, background: rgb(c.paper) }}>
        <div style={{ position: "absolute", inset: "0 auto 0 0", width: "29.5%", background: rgb(c.ink) }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "29.5%", width: "1.5%", background: rgb(c.accent) }} />
        <div style={{ position: "absolute", left: "6%", top: "8%", color: rgb(c.accent), fontFamily: B, fontWeight: 700, fontSize: s(8), letterSpacing: 1 }}>MYEDUPORT</div>
        <div style={{ position: "absolute", left: "38%", right: "6%", top: "38%" }}>
          <div style={{ color: rgb(c.accent), fontFamily: B, fontWeight: 700, fontSize: s(8), letterSpacing: 1 }}>PORTFOLIO REPORT</div>
          <div style={{ color: rgb(c.ink), fontFamily: H, fontWeight: 700, fontSize: s(26), lineHeight: 1.05, marginTop: "6%" }}>{L.title[0]}<br />{L.title[1]}</div>
          <div style={{ width: "30%", height: tiny ? 1 : 3, background: rgb(c.accent), margin: "8% 0" }} />
          {!tiny && <div style={{ color: rgb(c.inkSoft), fontFamily: H, fontSize: 13 }}>{name}</div>}
          {!tiny && major && <div style={{ color: rgb(c.inkSoft), fontFamily: B, fontSize: 10, marginTop: 4 }}>Intended major: {major}</div>}
        </div>
      </div>
    );
  }
  if (layout === "minimal") {
    return (
      <div style={{ ...base, background: "#fff" }}>
        <div style={{ position: "absolute", left: "10%", right: "10%", top: "9%", borderBottom: `1px solid ${rgb(c.rule)}`, paddingBottom: "2%", display: "flex", justifyContent: "space-between", color: rgb(c.inkSoft), fontFamily: B, fontSize: s(8) }}>
          <span>MyEduPort · Portfolio Report</span>{!tiny && <span>{fmtDate(new Date())}</span>}
        </div>
        <div style={{ position: "absolute", left: "10%", right: "10%", top: "38%" }}>
          <div style={{ color: rgb(c.ink), fontFamily: H, fontWeight: 700, fontSize: s(24) }}>{L.title[0]} {L.title[1]}</div>
          {!tiny && <div style={{ color: rgb(c.inkSoft), fontFamily: H, fontSize: 13, marginTop: 6 }}>{name}</div>}
          {!tiny && major && <div style={{ color: rgb(c.inkSoft), fontFamily: B, fontSize: 10, marginTop: 3 }}>{major}</div>}
          <div style={{ width: "12%", height: tiny ? 1 : 2, background: rgb(c.accent), marginTop: "6%" }} />
        </div>
      </div>
    );
  }
  if (layout === "bold") {
    return (
      <div style={{ ...base, background: rgb(c.ink) }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", background: rgb(c.accent) }} />
        <div style={{ position: "absolute", left: "10%", top: "8%", color: rgb(c.accent), fontFamily: B, fontWeight: 700, fontSize: s(8), letterSpacing: 1 }}>MYEDUPORT · PORTFOLIO REPORT</div>
        <div style={{ position: "absolute", left: "10%", top: "24%", color: "#fff", fontFamily: H, fontWeight: 800, fontSize: s(40), lineHeight: 1 }}>{L.title[0]}<br />{L.title[1]}</div>
        {!tiny && <div style={{ position: "absolute", left: "10%", bottom: "11%", color: rgb(c.ink), fontFamily: H, fontWeight: 700, fontSize: 17 }}>{name}</div>}
        {!tiny && <div style={{ position: "absolute", left: "10%", bottom: "6%", color: rgb(c.ink), fontFamily: B, fontSize: 10 }}>{major ? `Intended major: ${major}` : fmtDate(new Date())}</div>}
      </div>
    );
  }
  return (
    <div style={{ ...base, background: rgb(c.paper) }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "1.4%", background: rgb(c.accent) }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "10%", background: rgb(c.ink) }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "16%", textAlign: "center" }}>
        <div style={{ color: rgb(c.accent), fontFamily: B, fontWeight: 700, fontSize: s(7), letterSpacing: 1 }}>THE EXCELLENT PORTFOLIO GUIDE</div>
        <div style={{ color: rgb(c.ink), fontFamily: H, fontWeight: 700, fontSize: s(20), marginTop: "3%" }}>MyEduPort</div>
        <div style={{ width: "14%", height: tiny ? 1 : 2, background: rgb(c.accent), margin: "3% auto 7%" }} />
        <div style={{ color: rgb(c.ink), fontFamily: H, fontWeight: 700, fontSize: s(28), lineHeight: 1.1 }}>{L.title[0]}<br />{L.title[1]}</div>
        {!tiny && <div style={{ color: rgb(c.inkSoft), fontFamily: H, fontStyle: "italic", fontSize: 13, marginTop: "7%" }}>for {name}</div>}
      </div>
    </div>
  );
}

// How a section heading looks inside the report
function SectionPreview({ layout, palette: c, font: f }) {
  const H = f.css[0];
  const B = f.css[1];
  const title = "Extracurricular Activities";
  let head;
  if (layout === "modern") {
    head = (
      <div style={{ display: "flex", alignItems: "center", background: rgb(c.ink), color: "#fff", fontFamily: H, fontWeight: 700, fontSize: 13 }}>
        <span style={{ background: rgb(c.accent), padding: "4px 8px" }}>03</span><span style={{ padding: "4px 8px" }}>{title}</span>
      </div>
    );
  } else if (layout === "minimal") {
    head = (
      <div>
        <div style={{ fontFamily: B, fontSize: 9, color: rgb(c.inkSoft), letterSpacing: 1 }}>SECTION 03</div>
        <div style={{ fontFamily: H, fontWeight: 700, fontSize: 15, color: rgb(c.ink), borderBottom: `1px solid ${rgb(c.rule)}`, paddingBottom: 3 }}>{title}</div>
      </div>
    );
  } else if (layout === "bold") {
    head = (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: rgb(c.accent), color: "#fff", fontFamily: H, fontWeight: 700, fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>03</span>
        <span style={{ fontFamily: H, fontWeight: 800, fontSize: 16, color: rgb(c.ink) }}>{title}</span>
      </div>
    );
  } else {
    head = (
      <div style={{ borderTop: `2px solid ${rgb(c.ink)}`, paddingTop: 5 }}>
        <span style={{ fontFamily: H, fontWeight: 700, fontSize: 10, color: rgb(c.accent), marginRight: 8 }}>03</span>
        <span style={{ fontFamily: H, fontWeight: 700, fontSize: 16, color: rgb(c.ink) }}>{title}</span>
      </div>
    );
  }
  return (
    <div>
      {head}
      <div style={{ fontFamily: B, fontSize: 11, color: rgb(c.inkSoft), marginTop: 8, lineHeight: 1.5 }}>
        <strong style={{ color: rgb(c.ink) }}>FRC Robotics Team</strong> · Lead Programmer · 8 hrs/wk<br />
        Led 15-member team to first state finals in five years.
      </div>
    </div>
  );
}
