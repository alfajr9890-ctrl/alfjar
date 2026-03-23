import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatDateSafe = (date: any) => {
    try {
        if (!date) return "N/A";
        if (typeof date === "object" && date !== null && "seconds" in date) {
            return format(new Date(date.seconds * 1000), "PPP");
        }
        if (typeof date === "string") {
            return format(new Date(date), "PPP");
        }
        if (date instanceof Date) {
            return format(date, "PPP");
        }
        return "N/A";
    } catch {
        return "Invalid Date";
    }
};

const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network response was not ok");
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Image loading failed, falling back", e);
        return null; // Fallback silent error
    }
};

export const exportMembersToCSV = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members: any[],
    filename: string
) => {
    try {
        const headers = ["Full Name", "Member ID", "Email", "Mobile Number", "Aadhaar Number", "Address", "Role", "Team", "Status", "Membership Type", "Date of Joining", "Opening Balance", "Photo URL"];
        
        const rows = members.map(m => [
            `"${(m.fullName || "N/A").replace(/"/g, '""')}"`,
            m.id,
            `"${(m.email || "N/A").replace(/"/g, '""')}"`,
            `"${(m.mobileNumber || "N/A").replace(/"/g, '""')}"`,
            `"${(m.adharNumber || "N/A").replace(/"/g, '""')}"`,
            `"${(m.address || "N/A").replace(/"/g, '""')}"`,
            m.role || "N/A",
            m.team || "N/A",
            m.status || "N/A",
            m.membershipType || "N/A",
            formatDateSafe(m.dateOfJoining || m.createdAt),
            m.openingBalance !== undefined ? m.openingBalance : "N/A",
            m.photoUrl || "N/A"
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

export const exportMembersToPDF = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members: any[],
    filename: string,
    isSingle: boolean
) => {
    try {
        const doc = new jsPDF();
        let currentY = 20;

        doc.setFontSize(22);
        doc.text("ALF Organization", 14, 20);
        doc.setFontSize(16);
        doc.text(isSingle ? "Member Profile" : "Member Directory", 14, 28);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 14, 34);
        currentY = 40;

        if (isSingle && members.length === 1) {
            // Detailed single profile
            const m = members[0];
            
            // Photo handling
            if (m.photoUrl) {
                const base64Img = await fetchImageAsBase64(m.photoUrl);
                if (base64Img) {
                    // Try to make it a 30x30 avatar
                    try {
                        doc.addImage(base64Img, 'JPEG', 14, currentY, 30, 30);
                    } catch {
                        // fallback if error parsing image
                        doc.text("Photo: Unavailable", 14, currentY + 15);
                    }
                } else {
                    doc.text("Photo: Unavailable", 14, currentY + 15);
                }
            } else {
                // Initials fallback
                doc.setDrawColor(200, 200, 200);
                doc.setFillColor(240, 240, 240);
                doc.rect(14, currentY, 30, 30, 'FD');
                doc.setTextColor(100);
                doc.setFontSize(14);
                const initials = (m.fullName || "?").substring(0, 2).toUpperCase();
                doc.text(initials, 22, currentY + 18);
            }

            doc.setTextColor(0);
            doc.setFontSize(14);
            doc.text(m.fullName || "Unknown Member", 50, currentY + 10);
            
            doc.setFontSize(11);
            doc.text(`Member ID: ${m.id}`, 50, currentY + 16);
            doc.text(`Email: ${m.email || 'N/A'}`, 50, currentY + 22);
            doc.text(`Mobile: ${m.mobileNumber || 'N/A'}`, 50, currentY + 28);
            
            currentY += 40;
            
            doc.text(`Role: ${m.role || 'N/A'}`, 14, currentY);
            doc.text(`Team: ${m.team || 'N/A'}`, 14, currentY + 6);
            doc.text(`Status: ${m.status || 'N/A'}`, 14, currentY + 12);
            doc.text(`Membership: ${m.membershipType || 'N/A'}`, 14, currentY + 18);
            
            currentY += 28;
            doc.text(`Aadhaar Number: ${m.adharNumber || 'N/A'}`, 14, currentY);
            doc.text(`Opening Balance: ${m.openingBalance !== undefined ? 'INR ' + m.openingBalance.toLocaleString() : 'N/A'}`, 14, currentY + 6);
            doc.text(`Joined: ${formatDateSafe(m.dateOfJoining || m.createdAt)}`, 14, currentY + 12);
            
            currentY += 20;
            const addressLines = doc.splitTextToSize(`Address: ${m.address || 'N/A'}`, 180);
            doc.text(addressLines, 14, currentY);
            
        } else {
            // Bulk export table
            doc.setFontSize(10);
            doc.text(`Total Members: ${members.length}`, 14, currentY - 2);

            const headers = ["Name", "ID", "Email", "Mobile", "Aadhaar", "Address", "Role", "Team", "Status", "Type", "Joined", "Bal."];
            const rows = members.map(m => [
                m.fullName || "N/A",
                m.id,
                m.email || "N/A",
                m.mobileNumber || "N/A",
                m.adharNumber || "N/A",
                m.address || "N/A",
                m.role || "N/A",
                m.team || "N/A",
                m.status || "N/A",
                m.membershipType || "N/A",
                formatDateSafe(m.dateOfJoining || m.createdAt),
                m.openingBalance !== undefined ? m.openingBalance : "N/A"
            ]);

            autoTable(doc, {
                head: [headers],
                body: rows,
                startY: currentY,
                theme: "striped",
                styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
                headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] },
                didDrawPage: (data) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const str = "Page " + (doc as any).internal.getNumberOfPages();
                    doc.setFontSize(10);
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                    doc.text(str, data.settings.margin.left, pageHeight - 10);
                },
            });
        }

        doc.save(filename);
    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    }
};
