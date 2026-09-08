/**
 * PDF Report Generator
 * Generates student result PDFs using PDFKit
 */

import PDFDocument from 'pdfkit';

/**
 * Generate a student result PDF
 * @returns {Buffer} PDF buffer
 */
export const generateResultPDF = async (submission) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const test = submission.test || {};
    const student = submission.student || {};

    // ─── Color palette ────────────────────────────────────────────────────────
    const INDIGO = '#6366f1';
    const DARK = '#0f172a';
    const CARD = '#1e293b';
    const TEXT = '#334155';
    const MUTED = '#94a3b8';
    const GREEN = '#10b981';
    const RED = '#ef4444';
    const AMBER = '#f59e0b';

    // ─── Header ───────────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 120).fill(DARK);
    doc.fillColor(INDIGO).fontSize(28).font('Helvetica-Bold').text('EXAMIFY', 50, 35);
    doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text('AI-Powered Examination System', 50, 68);

    // Report label
    doc.fillColor('white').fontSize(12).font('Helvetica-Bold').text('RESULT REPORT', 400, 50, { align: 'right' });
    doc.fillColor(MUTED).fontSize(9).text(new Date().toLocaleDateString('en-US', { dateStyle: 'long' }), 400, 70, { align: 'right', width: 145 });

    doc.y = 140;

    // ─── Test title ───────────────────────────────────────────────────────────
    doc.fillColor(DARK).fontSize(18).font('Helvetica-Bold').text(test.title || 'Examination', 50, doc.y);
    doc.moveDown(0.4);
    if (test.subject) {
      doc.fillColor(MUTED).fontSize(11).font('Helvetica').text(`Subject: ${test.subject}`, 50);
    }

    doc.moveDown(1.2);

    // ─── Student info + Score card side by side ───────────────────────────────
    const boxY = doc.y;

    // Student info box
    drawBox(doc, 50, boxY, 240, 100, '#f8fafc', '#e2e8f0');
    doc.fillColor(MUTED).fontSize(9).font('Helvetica-Bold').text('STUDENT', 65, boxY + 14);
    doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text(student.name || 'Student', 65, boxY + 28);
    if (student.studentId) {
      doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(`ID: ${student.studentId}`, 65, boxY + 46);
    }
    if (submission.submittedAt) {
      doc.fillColor(MUTED).fontSize(9).text(`Submitted: ${new Date(submission.submittedAt).toLocaleString()}`, 65, boxY + 62);
    }

    // Score box
    const scoreColor = submission.isPassed ? GREEN : RED;
    drawBox(doc, 310, boxY, 235, 100, '#f8fafc', '#e2e8f0');
    doc.fillColor(MUTED).fontSize(9).font('Helvetica-Bold').text('RESULT', 325, boxY + 14);

    // Big grade
    doc.fillColor(scoreColor).fontSize(36).font('Helvetica-Bold').text(submission.grade || 'N/A', 325, boxY + 22);

    doc.fillColor(DARK).fontSize(14).font('Helvetica-Bold')
       .text(`${submission.percentage?.toFixed(1) || 0}%`, 380, boxY + 28);
    doc.fillColor(MUTED).fontSize(10).font('Helvetica')
       .text(`${submission.totalScore?.toFixed(1) || 0} / ${submission.maxScore || 0} marks`, 380, boxY + 48);
    doc.fillColor(scoreColor).fontSize(11).font('Helvetica-Bold')
       .text(submission.isPassed ? '✓ PASSED' : '✗ NOT PASSED', 380, boxY + 68);

    doc.y = boxY + 115;

    // ─── Stats row ────────────────────────────────────────────────────────────
    const statsY = doc.y;
    const statItems = [
      { label: 'Correct', value: submission.correctAnswers || 0, color: GREEN },
      { label: 'Wrong', value: submission.wrongAnswers || 0, color: RED },
      { label: 'Skipped', value: submission.skippedAnswers || 0, color: MUTED },
      { label: 'Violations', value: submission.violationCount || 0, color: AMBER },
    ];
    const cellW = 119;
    statItems.forEach((s, i) => {
      drawBox(doc, 50 + i * (cellW + 3), statsY, cellW, 56, '#f8fafc', '#e2e8f0');
      doc.fillColor(s.color).fontSize(20).font('Helvetica-Bold')
         .text(String(s.value), 50 + i * (cellW + 3) + 10, statsY + 8, { width: cellW - 20, align: 'center' });
      doc.fillColor(MUTED).fontSize(8).font('Helvetica')
         .text(s.label.toUpperCase(), 50 + i * (cellW + 3) + 10, statsY + 34, { width: cellW - 20, align: 'center' });
    });

    doc.y = statsY + 72;

    // ─── Answer review ────────────────────────────────────────────────────────
    if (submission.answers?.length > 0) {
      doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text('Answer Review', 50, doc.y);
      doc.moveDown(0.5);

      submission.answers.forEach((ans, i) => {
        const q = ans.question;
        if (!q || doc.y > 700) {
          if (doc.y > 700) doc.addPage();
          return;
        }

        const qY = doc.y;
        const correct = ans.isCorrect;
        const dotColor = correct === true ? GREEN : correct === false ? RED : AMBER;

        // Question number dot
        doc.circle(58, qY + 6, 5).fill(dotColor);

        doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
           .text(`Q${i + 1}. ${q.questionText?.substring(0, 100) || ''}${q.questionText?.length > 100 ? '...' : ''}`,
             70, qY, { width: 430 });

        doc.moveDown(0.2);

        // Score for this question
        doc.fillColor(dotColor).fontSize(9).font('Helvetica')
           .text(`${ans.marksAwarded?.toFixed(1) || 0} / ${ans.maxMarks || 0} marks`, 70, doc.y);

        if (q.type === 'short' && ans.textAnswer) {
          doc.moveDown(0.2);
          doc.fillColor(MUTED).fontSize(8).font('Helvetica-Oblique')
             .text(`Answer: ${ans.textAnswer?.substring(0, 120)}...`, 80, doc.y, { width: 420 });
          if (ans.aiFeedback) {
            doc.moveDown(0.1);
            doc.fillColor(INDIGO).fontSize(8)
               .text(`AI: ${ans.aiFeedback}`, 80, doc.y, { width: 420 });
          }
        }

        doc.moveDown(0.6);

        // Separator
        doc.moveTo(70, doc.y).lineTo(540, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.moveDown(0.4);
      });
    }

    // ─── Footer on each page ──────────────────────────────────────────────────
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.rect(0, 780, 595, 62).fill(DARK);
      doc.fillColor(MUTED).fontSize(9).font('Helvetica')
         .text(`Generated by Examify · ${new Date().toLocaleString()} · Confidential`, 50, 795, { align: 'center', width: 495 });
    }

    doc.end();
  });
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function drawBox(doc, x, y, w, h, fill, stroke) {
  doc.roundedRect(x, y, w, h, 6).fillAndStroke(fill, stroke);
}
