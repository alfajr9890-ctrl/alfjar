import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  date: any;
  creatorId: string;
  memberId: string;
  memberName?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatDate = (date: any) => {
  try {
    if (!date) return "N/A";

    // Handle Firestore Timestamp
    if (typeof date === "object" && date !== null && "seconds" in date) {
      return format(new Date(date.seconds * 1000), "PPP");
    }

    // Handle ISO String or standard date string
    if (typeof date === "string") {
      return format(new Date(date), "PPP");
    }

    // Handle Date object
    if (date instanceof Date) {
      return format(date, "PPP");
    }

    return "N/A";
  } catch (e) {
    console.error("Error formatting date:", e, date);
    return "Invalid Date";
  }
};

/**
 * Generates a PDF for a list of transactions.
 * @param transactions - An array of transaction objects.
 * @param title - The title of the PDF document.
 */
export const generateTransactionPDF = (
  transactions: Transaction[],
  title: string = "Transaction Report",
) => {
  try {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 14, 30);

    const tableColumn = [
      "Date",
      "Member Name",
      "Member ID",
      "Description",
      "Type",
      "Amount",
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableRows: any[] = [];

    transactions.forEach((transaction) => {
      const transactionData = [
        formatDate(transaction.date),
        transaction.memberName || "N/A",
        transaction.memberId || "N/A",
        transaction.description || "No description",
        transaction.type.toUpperCase(),
        `INR ${transaction.amount.toFixed(2)}`,
      ];
      tableRows.push(transactionData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: "striped",
      headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] },
      margin: { top: 35 },
      didDrawPage: (data) => {
        // Footer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const str = "Page " + (doc as any).internal.getNumberOfPages();
        doc.setFontSize(10);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height
          ? pageSize.height
          : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      },
    });

    doc.save(
      `${title.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyyMMdd")}.pdf`,
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

/**
 * Generates a PDF for a single transaction.
 * @param transaction - The transaction object.
 */
export const generateSingleTransactionPDF = (transaction: Transaction) => {
  generateTransactionPDF([transaction], `Transaction Receipt`);
};
