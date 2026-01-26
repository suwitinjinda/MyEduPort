import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import jsPDF from "jspdf";

export default function ExportPortfolio() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [sections, setSections] = useState({
    academics: true,
    tests: true,
    activities: true,
    awards: true,
    personalStatement: true,
    documents: true
  });

  const [portfolioData, setPortfolioData] = useState(null);

  useEffect(() => {
    loadPortfolioData();
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

      // Helper function to draw a line
      const drawLine = (y) => {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
      };

      // Helper function to add text with word wrap
      const addText = (text, x, y, maxWidth, fontSize = 10, fontStyle = "normal") => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        const lines = doc.splitTextToSize(text || "", maxWidth);
        doc.text(lines, x, y);
        return lines.length * (fontSize * 0.4); // Approximate line height
      };

      // ========== PAGE 1: COVER PAGE ==========
      doc.setFillColor(34, 197, 94); // Green
      doc.rect(0, 0, pageWidth, 30, "F");
      doc.setFillColor(59, 130, 246); // Blue
      doc.rect(0, pageHeight - 30, pageWidth, 30, "F");

      yPos = 50;
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 197, 94);
      doc.text("MyEduPort", pageWidth / 2, yPos, { align: "center" });

      yPos += 20;
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Educational Portfolio", pageWidth / 2, yPos, { align: "center" });

      yPos += 15;
      doc.setFontSize(18);
      doc.setFont("helvetica", "normal");
      const studentName = portfolioData.user?.name || portfolioData.profile?.name || "Student";
      doc.text(`- ${studentName} -`, pageWidth / 2, yPos, { align: "center" });

      yPos = pageHeight - 60;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Student:", margin, yPos);
      doc.setFont("helvetica", "bold");
      doc.text(studentName, margin + 30, yPos);

      yPos += 8;
      doc.setFont("helvetica", "normal");
      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      doc.text(`Date: ${currentDate}`, margin, yPos);

      // ========== PAGE 2: TABLE OF CONTENTS ==========
      doc.addPage();
      yPos = margin;

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Table of Contents", pageWidth / 2, yPos, { align: "center" });

      yPos += 20;
      drawLine(yPos);
      yPos += 10;

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
      doc.setFont("helvetica", "normal");
      tocItems.forEach((item) => {
        doc.text(item.title, margin, yPos);
        const dots = ".".repeat(60);
        const pageText = String(item.page);
        const textWidth = doc.getTextWidth(item.title + dots);
        doc.text(dots, margin + textWidth, yPos);
        doc.text(pageText, pageWidth - margin - 10, yPos, { align: "right" });
        yPos += 10;
      });

      // ========== PAGE 3+: CONTENT SECTIONS ==========
      let currentPage = 3;

      // 1. Academics Section
      if (sections.academics && portfolioData.academics.length > 0) {
        doc.addPage();
        yPos = margin;
        currentPage++;

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("1. Academics", margin, yPos);
        yPos += 15;

        // Academic Records Table
        const tableTop = yPos;
        const colWidths = [30, 60, 40, 40];
        const headers = ["Year", "Course", "Level", "Grade"];

        // Table Header
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, contentWidth, rowHeight, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        let xPos = margin + 5;
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos + 6);
          xPos += colWidths[i];
        });
        yPos += rowHeight;
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

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("2. Standardized Test Scores", margin, yPos);
        yPos += 15;

        const testTableTop = yPos;
        const testColWidths = [50, 40, 40, 50];
        const testHeaders = ["Test Name", "Score", "Date", "Notes"];

        // Test Scores Table Header
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, contentWidth, rowHeight, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
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

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("3. Extracurricular Activities", margin, yPos);
        yPos += 15;

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

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("4. Awards & Achievements", margin, yPos);
        yPos += 15;

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

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("5. Personal Statement", margin, yPos);
        yPos += 15;

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

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("6. Uploaded Documents", margin, yPos);
        yPos += 15;

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

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="card">
        <div
          style={{
            background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            color: "#fff",
            padding: "2rem",
            borderRadius: "0.75rem",
            marginBottom: "2rem",
            textAlign: "center"
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>Export Portfolio</h1>
          <p style={{ fontSize: "1.125rem", opacity: 0.95 }}>Generate a professional PDF of your educational portfolio</p>
        </div>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem" }}>Select Sections</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Choose which sections to include in your exported portfolio:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {Object.entries(sections).map(([key, value]) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  background: value ? "var(--bg-secondary)" : "transparent",
                  transition: "all 0.2s ease"
                }}
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={toggle(key)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ textTransform: "capitalize", fontSize: "0.9375rem" }}>
                  {key === "personalStatement"
                    ? "Personal Statement"
                    : key === "tests"
                    ? "Standardized Test Scores"
                    : key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {status && (
          <div
            className="card"
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: status.includes("Error") || status.includes("error")
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(16, 185, 129, 0.1)"
            }}
          >
            <p
              style={{
                margin: 0,
                color: status.includes("Error") || status.includes("error") ? "var(--error)" : "var(--success)",
                fontWeight: "600"
              }}
            >
              {status}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            className="button"
            onClick={generatePDF}
            disabled={loading || !portfolioData}
            style={{ flex: 1 }}
          >
            {loading ? "Generating PDF..." : "Export PDF"}
          </button>
        </div>

        {!portfolioData && (
          <p className="muted" style={{ marginTop: "1rem", textAlign: "center" }}>
            Loading portfolio data...
          </p>
        )}
      </div>
    </div>
  );
}
