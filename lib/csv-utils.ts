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

export const generateTransactionCSV = (
  transactions: Transaction[],
  filename: string = "transactions.csv",
) => {
  try {
    const headers = [
      "Date",
      "Member Name",
      "Member ID",
      "Description",
      "Type",
      "Amount",
      "Reference ID",
    ];

    const rows = transactions.map((t) => [
      formatDate(t.date),
      `"${(t.memberName || "N/A").replace(/"/g, '""')}"`,
      t.memberId,
      `"${(t.description || "No description").replace(/"/g, '""')}"`, // Escape quotes
      t.type.toUpperCase(),
      t.amount.toFixed(2),
      t.id,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error("Error generating CSV:", error);
    throw error;
  }
};

export const generateSingleTransactionCSV = (transaction: Transaction) => {
  generateTransactionCSV([transaction], `transaction-${transaction.id}.csv`);
};