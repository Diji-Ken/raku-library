import { useRef, forwardRef } from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HTMLFlipBook from 'react-pageflip';
import type { DocumentNode } from '../types';

interface SpreadViewProps {
  document: DocumentNode;
  currentPage: number;
  zoom: number;
  rotation: number;
  onPageChange: (page: number) => void;
}

// ページコンポーネント（react-pageflip用）
const PageContent = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    return (
      <div ref={ref} className="page-wrapper">
        {children}
      </div>
    );
  }
);

PageContent.displayName = 'PageContent';

const SpreadView: React.FC<SpreadViewProps> = ({
  document,
  currentPage,
  zoom,
  rotation,
  onPageChange,
}) => {
  const bookRef = useRef<any>(null);
  const totalPages = document.pages?.length || 0;
  const pdfScale = zoom / 100 * 0.45;

  const handlePrevPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const handleNextPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  const handleFlip = (e: any) => {
    // ページがめくられた時のコールバック
    onPageChange(e.data + 1); // 0-indexedなので+1
  };

  // PDFファイルがある場合
  if (document.originalFile) {
    return (
      <div className="spread-viewer">
        <Document
          file={document.originalFile}
          onLoadError={(error) => console.error('PDF読み込みエラー:', error)}
        >
          <div className="flipbook-container">
            <HTMLFlipBook
              ref={bookRef}
              width={350}
              height={480}
              size="stretch"
              minWidth={250}
              maxWidth={500}
              minHeight={350}
              maxHeight={600}
              showCover={true}
              mobileScrollSupport={true}
              onFlip={handleFlip}
              className="flip-book"
              style={{}}
              startPage={currentPage - 1}
              drawShadow={true}
              flippingTime={1000}
              usePortrait={true}
              startZIndex={0}
              autoSize={true}
              maxShadowOpacity={0.5}
              showPageCorners={true}
              disableFlipByClick={false}
            >
              {Array.from({ length: totalPages }, (_, index) => (
                <PageContent key={index}>
                  <div className="page-content">
                    <Page
                      pageNumber={index + 1}
                      scale={pdfScale}
                      rotate={rotation}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                </PageContent>
              ))}
            </HTMLFlipBook>
          </div>
        </Document>

        <div className="page-controls">
          <button
            className="page-nav-btn"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft size={24} />
            前のページ
          </button>

          <div className="page-info">
            <span>{currentPage} / {totalPages}</span>
          </div>

          <button
            className="page-nav-btn"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
          >
            次のページ
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  }

  // テキストコンテンツの場合
  return (
    <div className="spread-viewer">
      <div className="flipbook-container">
        <HTMLFlipBook
          ref={bookRef}
          width={350}
          height={480}
          size="stretch"
          minWidth={250}
          maxWidth={500}
          minHeight={350}
          maxHeight={600}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={handleFlip}
          className="flip-book"
          style={{}}
          startPage={currentPage - 1}
          drawShadow={true}
          flippingTime={1000}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.5}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {document.pages.map((page, index) => (
            <PageContent key={index}>
              <div className="text-page">
                {page.content || ''}
              </div>
            </PageContent>
          ))}
        </HTMLFlipBook>
      </div>

      <div className="page-controls">
        <button
          className="page-nav-btn"
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
        >
          <ChevronLeft size={24} />
          前のページ
        </button>

        <div className="page-info">
          <span>{currentPage} / {totalPages}</span>
        </div>

        <button
          className="page-nav-btn"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
        >
          次のページ
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default SpreadView;
