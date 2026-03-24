import pypdf
import sys

def extract_text(pdf_path, start_page, end_page):
    try:
        reader = pypdf.PdfReader(pdf_path)
        total_pages = len(reader.pages)
        print(f"Total pages: {total_pages}")
        
        end_page = min(end_page, total_pages)
        text = ""
        for i in range(start_page, end_page):
            text += f"\n--- Page {i} ---\n"
            text += reader.pages[i].extract_text()
            
        print(text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python read_pdf.py <pdf_path> <start_page> <end_page>")
    else:
        extract_text(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
