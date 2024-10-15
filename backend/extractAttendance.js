function extractAttendanceForSubject(pdfText, subjectName) {
    const lowerCaseText = pdfText.toLowerCase();
    subjectName = subjectName.toLowerCase();

    // Locate the index of the subject name
    const subjectStartIndex = lowerCaseText.indexOf(subjectName);
    console.log('Subject start index:', subjectStartIndex);

    if (subjectStartIndex === -1) {
        throw new Error(`Subject "${subjectName}" not found in the PDF.`);
    }

    // Get the attendance data starting from the subject's position
    const subjectText = pdfText.slice(subjectStartIndex);
    const attendanceLines = subjectText.split('\n');

    const attendanceData = [];
    for (let line of attendanceLines) {
        line = line.trim();

        // Skip empty lines
        if (!line) continue;

        // Use regex to split student data lines
        const studentDataRegex = /^(\d{2,}\w+)\s+(\D+)\s+(\d+)\s+(\d+)/;
        const match = line.match(studentDataRegex);

        if (match) {
            const enrollmentNo = match[1];  // First group is the enrollment number
            const name = match[2];          // Second group is the student's name
            const totalClassesHeld = match[3];  // Third group is total classes held
            const totalClassesAttended = match[4]; // Fourth group is total classes attended

            attendanceData.push({
                enrollmentNo,
                name,
                totalClassesHeld,
                totalClassesAttended
            });
        } else {
            console.log('Skipping line (not matching student data pattern):', line);
        }
    }

    console.log('Extracted attendance data:', attendanceData);
    return attendanceData;
}

module.exports = {
    extractAttendanceForSubject
};
