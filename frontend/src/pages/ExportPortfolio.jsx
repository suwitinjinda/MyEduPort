import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import jsPDF from "jspdf";

const TEMPLATES = {
  classic: { name: "Classic", blurb: "Navy & gold, serif — the editorial default.", INK: [10, 31, 68], GOLD: [201, 169, 97], PAPER: [250, 248, 243], RULE: [200, 192, 165], INK_SOFT: [74, 88, 114], title: ["Portfolio", "Dossier"] },
  modern: { name: "Modern", blurb: "Slate & teal — clean and contemporary.", INK: [15, 42, 58], GOLD: [13, 148, 136], PAPER: [248, 250, 250], RULE: [188, 205, 205], INK_SOFT: [71, 85, 105], title: ["Application", "Portfolio"] },
  minimal: { name: "Minimal", blurb: "Monochrome — understated and ATS-friendly.", INK: [24, 24, 27], GOLD: [113, 113, 122], PAPER: [255, 255, 255], RULE: [212, 212, 216], INK_SOFT: [63, 63, 70], title: ["Student", "Portfolio"] }
};

export default function ExportPortfolio() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [template, setTemplate] = useState("classic");
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
    apiFetch("/api/students/me/plan").then((p) => setCanExport(!!p?.features?.export)).catch(() => {});
  }, []);

  const loadPortfolioData = async () => {
    try {
      const [user, profile, academics, tests, activities, awards, documents, essays] = await Promise.all([
        apiFetch("/api/auth/me").catch(() => null),
        apiFetch("/api/students/me").catch(() => null),
        apiFetch("/api/students/me/academics").catch(() => []),
        apiFetch("/api/students/me/tests").catch(() => []),
        apiFetch("/api/students/me/activities").catch(() => []),
        apiFetch("/api/students/me/awards").catch(() => []),
        apiFetch("/api/uploads/me").catch(() => []),
        apiFetch("/api/students/me/essays").catch(() => [])
      ]);

      setPortfolioData({
        user,
        profile,
        academics: academics || [],
        tests: tests || [],
        activities: activities || [],
        awards: awards || [],
        documents: documents || [],
        essays: essays || []
      });
    } catch (err) {
      console.error("Failed to load portfolio data:", err);
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
      const T = TEMPLATES[template] || TEMPLATES.classic;
      const INK = T.INK;
      const GOLD = T.GOLD;
      const PAPER = T.PAPER;
      const RULE = T.RULE;
      const INK_SOFT = T.INK_SOFT;

      // Helper function to draw a line
      const drawLine = (y, color = RULE) => {
        doc.setDrawColor(...color);
        doc.line(margin, y, pageWidth - margin, y);
      };

      // Section heading — gold rule + navy serif
      const sectionHead = (num, title) => {
        doc.setDrawColor(...INK);
        doc.setLineWidth(0.6);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        doc.setLineWidth(0.2);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont("times", "bold");
        doc.setTextColor(...GOLD);
        doc.text(String(num).padStart(2, "0"), margin, yPos);
        doc.setFontSize(20);
        doc.setFont("times", "bold");
        doc.setTextColor(...INK);
        doc.text(title, margin + 12, yPos);
        yPos += 8;
        doc.setDrawColor(...GOLD);
        doc.line(margin + 12, yPos, margin + 30, yPos);
        doc.setDrawColor(...RULE);
        yPos += 10;
      };

      // ========== PAGE 1: COVER PAGE ==========
      // Cream background
      doc.setFillColor(...PAPER);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      // Top gold rule
      doc.setFillColor(...GOLD);
      doc.rect(0, 0, pageWidth, 4, "F");
      // Bottom navy band
      doc.setFillColor(...INK);
      doc.rect(0, pageHeight - 30, pageWidth, 30, "F");

      // Eyebrow / kicker
      yPos = 55;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GOLD);
      doc.text("THE EXCELLENT PORTFOLIO GUIDE", pageWidth / 2, yPos, { align: "center", charSpace: 1 });

      // Brand
      yPos += 14;
      doc.setFontSize(28);
      doc.setFont("times", "bold");
      doc.setTextColor(...INK);
      doc.text("MyEduPort", pageWidth / 2, yPos, { align: "center" });

      // Gold rule
      yPos += 8;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.8);
      doc.line(pageWidth / 2 - 15, yPos, pageWidth / 2 + 15, yPos);
      doc.setLineWidth(0.2);

      // Main title
      yPos += 22;
      doc.setFontSize(36);
      doc.setFont("times", "bold");
      doc.setTextColor(...INK);
      doc.text(T.title[0], pageWidth / 2, yPos, { align: "center" });
      yPos += 14;
      doc.text(T.title[1], pageWidth / 2, yPos, { align: "center" });

      // Student name in italic serif
      yPos += 22;
      doc.setFontSize(16);
      doc.setFont("times", "italic");
      doc.setTextColor(...INK_SOFT);
      const studentName = portfolioData.user?.name || portfolioData.profile?.name || "Student";
      doc.text(`for ${studentName}`, pageWidth / 2, yPos, { align: "center" });

      // Footer block in navy band
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GOLD);
      doc.text("PREPARED", margin, pageHeight - 18, { charSpace: 1 });
      doc.setFontSize(11);
      doc.setFont("times", "normal");
      doc.setTextColor(...PAPER);
      const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      doc.text(currentDate, margin, pageHeight - 11);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GOLD);
      doc.text("STUDENT", pageWidth - margin, pageHeight - 18, { align: "right", charSpace: 1 });
      doc.setFontSize(11);
      doc.setFont("times", "normal");
      doc.setTextColor(...PAPER);
      doc.text(studentName, pageWidth - margin, pageHeight - 11, { align: "right" });

      // Reset text color to default for subsequent pages
      doc.setTextColor(...INK);

      // ========== PAGE 2: TABLE OF CONTENTS ==========
      doc.addPage();
      yPos = margin + 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GOLD);
      doc.text("CONTENTS", pageWidth / 2, yPos, { align: "center", charSpace: 1 });
      yPos += 8;
      doc.setFontSize(26);
      doc.setFont("times", "bold");
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
      doc.setFont("times", "normal");
      doc.setTextColor(...INK_SOFT);
      tocItems.forEach((item) => {
        doc.text(item.title, margin, yPos);
        const dots = ". ".repeat(40);
        doc.setTextColor(...RULE);
        doc.text(dots, margin + doc.getTextWidth(item.title) + 3, yPos);
        doc.setTextColor(...INK);
        doc.setFont("times", "bold");
        doc.text(String(item.page), pageWidth - margin, yPos, { align: "right" });
        doc.setFont("times", "normal");
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
        doc.setFont("helvetica", "bold");
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
        doc.setFont("helvetica", "normal");
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
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...PAPER);
        let xPos = margin + 5;
        testHeaders.forEach((header, i) => {
          doc.text(header, xPos, yPos + 6);
          xPos += testColWidths[i];
        });
        yPos += rowHeight;
        drawLine(yPos);

        // Test Scores Table Rows
        doc.setFont("helvetica", "normal");
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
        doc.setFont("helvetica", "normal");
        portfolioData.activities.forEach((activity, index) => {
          checkPageBreak(30);
          doc.setFont("helvetica", "bold");
          doc.text(`${index + 1}. ${activity.title || "Activity"}`, margin, yPos);
          yPos += 7;

          doc.setFont("helvetica", "normal");
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
        doc.setFont("helvetica", "normal");
        portfolioData.awards.forEach((award, index) => {
          checkPageBreak(25);
          doc.setFont("helvetica", "bold");
          doc.text(`${index + 1}. ${award.title || "Award"}`, margin, yPos);
          yPos += 7;

          doc.setFont("helvetica", "normal");
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
          doc.setFont("helvetica", "normal");
          const bioLines = doc.splitTextToSize(bio, contentWidth);
          doc.text(bioLines, margin, yPos);
          yPos += bioLines.length * 5;
        } else {
          doc.setFontSize(11);
          doc.setFont("helvetica", "italic");
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
        doc.setFont("helvetica", "normal");
        portfolioData.documents.forEach((document, index) => {
          checkPageBreak(15);
          const docName = document.filename || document.original_filename || `Document ${index + 1}`;
          const docType = document.category || "General";
          doc.text(`${index + 1}. ${docName} (${docType})`, margin, yPos);
          yPos += 8;
        });
      }

      // Save PDF
      const fileName = `Educational_Portfolio_${studentName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
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
    <div style={{ maxWidth: "780px", margin: "0 auto" }}>
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

      <section className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>Choose a template</h2>
        <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Pick a look for your exported report. Each template restyles the cover and palette.
        </p>
        <div className="grid three">
          {Object.entries(TEMPLATES).map(([key, t]) => {
            const active = template === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTemplate(key)}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  padding: "1.1rem",
                  borderRadius: "var(--r-md)",
                  border: active ? "2px solid var(--gold-deep)" : "1px solid var(--rule)",
                  background: active ? "var(--surface-warm)" : "var(--surface)",
                  fontFamily: "inherit"
                }}
              >
                <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.6rem" }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "3px", background: `rgb(${t.INK.join(",")})` }} />
                  <span style={{ width: "18px", height: "18px", borderRadius: "3px", background: `rgb(${t.GOLD.join(",")})` }} />
                  <span style={{ width: "18px", height: "18px", borderRadius: "3px", border: "1px solid var(--rule)", background: `rgb(${t.PAPER.join(",")})` }} />
                </div>
                <div className="subtitle" style={{ fontSize: "1rem" }}>{t.name}{active ? " ✓" : ""}</div>
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.3rem" }}>{t.blurb}</p>
              </button>
            );
          })}
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
