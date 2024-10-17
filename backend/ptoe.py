import pdfplumber
import pandas as pd
import os
import argparse

def pdf_to_excel(pdf_path, output_excel_path):
    # Open the PDF
    with pdfplumber.open(pdf_path) as pdf:
        all_tables = []  # List to hold data from all pages
        header_found = False  # Flag to mark when the header is found
        for page_num, page in enumerate(pdf.pages):
            # Extract tables from each page
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        if not header_found:
                            # Check if this row is the header (e.g., contains subject names like TH, LAB)
                            if "Enrollment_No" in row or "Name" in row:
                                all_tables.append(row)  # Save the header row
                                header_found = True  # Mark the header as found
                        else:
                            # Extract only rows with serial numbers
                            if row[0].strip().isdigit():  # Assuming serial numbers are in the first column
                                all_tables.append(row)
    
    # Convert the extracted tables into a DataFrame
    final_df = pd.DataFrame(all_tables)

    # Create the output Excel file if it doesn't exist
    output_dir = os.path.dirname(output_excel_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Write the DataFrame to an Excel file
    final_df.to_excel(output_excel_path, index=False)
    print(f"Filtered data has been successfully converted to {output_excel_path}")

# Main function to handle command-line arguments
def main():
    parser = argparse.ArgumentParser(description="Convert PDF with tables to Excel")
    parser.add_argument("pdf_path", help="Path to the input PDF file")
    parser.add_argument("output_excel_path", help="Path to save the output Excel file")

    args = parser.parse_args()

    # Call the PDF to Excel function
    pdf_to_excel(args.pdf_path, args.output_excel_path)

if __name__ == "__main__":
    main()
