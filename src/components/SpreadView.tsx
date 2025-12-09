import { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DocumentNode } from '../types';

interface SpreadViewProps {
  document: DocumentNode;
  currentPage: number;
  zoom: number;
  rotation: number;
  onPageChange: (page: number) => void;
  sidebarWidth?: number; // サイドバーの幅（オプション）
}

const SpreadView: React.FC<SpreadViewProps> = ({
  document,
  currentPage,
  zoom,
  rotation,
  onPageChange,
  sidebarWidth = 0,
}) => {
  const [numPages, setNumPages] = useState<number>(document.pages?.length || 0);
  // PDFファイルの場合のみローディング状態を管理
  const isPDF = !!(document.originalFile || document.pdfUrl);
  const [isLoading, setIsLoading] = useState<boolean>(isPDF);
  const [internalPage, setInternalPage] = useState<number>(1);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const totalPages = numPages || document.pages?.length || 0;
  const pdfScale = zoom / 100;

  // 見開き表示用：左ページと右ページの番号を計算
  const leftPage = internalPage % 2 === 0 ? internalPage - 1 : internalPage;
  const rightPage = leftPage + 1 <= totalPages ? leftPage + 1 : null;

  // 画面サイズに応じて本のサイズを動的に計算
  const [pageWidth, setPageWidth] = useState<number>(420);
  const [pageHeight, setPageHeight] = useState<number>(580);

  useEffect(() => {
    const updatePageSize = () => {
      // 利用可能な画面サイズを計算（余白を完全に削除）
      // ページコントロール(約50px)のみ
      const availableHeight = window.innerHeight - 50;
      const availableWidth = window.innerWidth - sidebarWidth; // サイドバーの幅を引く

      // A4比率（1:1.41）を基準に計算
      const aspectRatio = 1.41;

      // 見開きなので幅は2ページ分必要
      // 中央のborderのみ考慮（2px）

      // 幅基準で計算
      const widthBasedPageWidth = (availableWidth - 2) / 2;
      const widthBasedPageHeight = widthBasedPageWidth * aspectRatio;

      // 高さ基準で計算
      const heightBasedPageHeight = availableHeight;
      const heightBasedPageWidth = heightBasedPageHeight / aspectRatio;

      // 両方に収まる最大サイズを選択
      let finalPageWidth: number;
      let finalPageHeight: number;

      if (widthBasedPageHeight <= availableHeight) {
        // 幅基準で画面に収まる
        finalPageWidth = widthBasedPageWidth;
        finalPageHeight = widthBasedPageHeight;
      } else {
        // 高さが超えるので、高さ基準にする
        finalPageWidth = heightBasedPageWidth;
        finalPageHeight = heightBasedPageHeight;
      }

      setPageWidth(Math.floor(finalPageWidth));
      setPageHeight(Math.floor(finalPageHeight));
    };

    updatePageSize();
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, [sidebarWidth]);

  // キーボードの左右矢印キーでページめくり
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [internalPage, isFlipping, totalPages, rightPage]);

  const handlePrevPage = () => {
    if (isFlipping || internalPage <= 1) return;

    const newPage = Math.max(1, internalPage - 2);
    setFlipDirection('prev');
    setIsFlipping(true);

    // アニメーションの途中でページを更新し、transformをリセット
    setTimeout(() => {
      setInternalPage(newPage);
      onPageChange(newPage);
      setFlipDirection(null); // transformを0度にリセット
    }, 500);

    // アニメーション終了後にフリップ状態をリセット
    setTimeout(() => {
      setIsFlipping(false);
    }, 1000);
  };

  const handleNextPage = () => {
    // 右ページが存在しない、または既に最後のページを表示している場合は何もしない
    if (isFlipping || !rightPage || rightPage >= totalPages) return;

    const newPage = Math.min(totalPages, internalPage + 2);
    setFlipDirection('next');
    setIsFlipping(true);

    // アニメーションの途中でページを更新し、transformをリセット
    setTimeout(() => {
      setInternalPage(newPage);
      onPageChange(newPage);
      setFlipDirection(null); // transformを0度にリセット
    }, 500);

    // アニメーション終了後にフリップ状態をリセット
    setTimeout(() => {
      setIsFlipping(false);
    }, 1000);
  };

  // ページクリックでめくる（クリックしたページだけをめくる）
  const handleLeftPageClick = () => {
    if (isFlipping || internalPage <= 1) return;

    const newPage = Math.max(1, leftPage - 2);
    setFlipDirection('prev');
    setIsFlipping(true);

    // アニメーションの途中でページを更新し、transformをリセット
    setTimeout(() => {
      setInternalPage(newPage);
      onPageChange(newPage);
      setFlipDirection(null); // transformを0度にリセット
    }, 500);

    // アニメーション終了後にフリップ状態をリセット
    setTimeout(() => {
      setIsFlipping(false);
    }, 1000);
  };

  const handleRightPageClick = () => {
    // 右ページが存在しない、または既に最後のページを表示している場合は何もしない
    if (isFlipping || !rightPage || rightPage >= totalPages) return;

    const newPage = Math.min(totalPages, leftPage + 2);
    setFlipDirection('next');
    setIsFlipping(true);

    // アニメーションの途中でページを更新し、transformをリセット
    setTimeout(() => {
      setInternalPage(newPage);
      onPageChange(newPage);
      setFlipDirection(null); // transformを0度にリセット
    }, 500);

    // アニメーション終了後にフリップ状態をリセット
    setTimeout(() => {
      setIsFlipping(false);
    }, 1000);
  };

  // PDFファイルがある場合（originalFileまたはpdfUrl）
  if (document.originalFile || document.pdfUrl) {
    // pdfUrlの場合はURL encodeが必要（日本語文字対応）
    let pdfSource = document.originalFile;
    if (!pdfSource && document.pdfUrl) {
      // URLの各部分をencodeする（/files/の部分は除く）
      const parts = document.pdfUrl.split('/');
      const encodedParts = parts.map((part, index) =>
        index < parts.length - 1 ? part : encodeURIComponent(part)
      );
      pdfSource = encodedParts.join('/');
    }
    return (
      <div className="spread-viewer">
        <Document
          file={pdfSource}
          onLoadSuccess={({ numPages }) => {
            console.log('PDF loaded successfully:', numPages, 'pages');
            setNumPages(numPages);
            setIsLoading(false);
          }}
          onLoadError={(error) => {
            console.error('PDF読み込みエラー:', error);
            setIsLoading(false);
          }}
        >
          {isLoading ? (
            <div className="pdf-loading" style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>
              PDFを読み込んでいます...
            </div>
          ) : totalPages === 0 ? (
            <div className="pdf-error" style={{ padding: '40px', textAlign: 'center', fontSize: '18px', color: 'red' }}>
              PDFの読み込みに失敗しました
            </div>
          ) : (
            <div className="spread-book-container" style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0',
              perspective: '3000px',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                borderRadius: '12px',
                overflow: 'visible',
                transformStyle: 'preserve-3d',
                maxWidth: '100%'
              }}>
                {/* 左ページ */}
                <div
                  onClick={handleLeftPageClick}
                  style={{
                    width: `${pageWidth * (zoom / 100)}px`,
                    height: `${pageHeight}px`,
                    backgroundColor: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRight: '2px solid #ccc',
                    boxShadow: 'inset -15px 0 30px rgba(0,0,0,0.15)',
                    cursor: internalPage > 1 ? 'pointer' : 'default',
                    position: 'relative',
                    transformOrigin: 'right center',
                    transform: isFlipping && flipDirection === 'prev'
                      ? 'rotateY(180deg) translateZ(2px)'
                      : 'rotateY(0deg)',
                    transition: flipDirection !== null ? 'transform 1s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none',
                    zIndex: isFlipping && flipDirection === 'prev' ? 10 : 1,
                    overflow: 'hidden'
                  }}
                >
                  <Page
                    pageNumber={leftPage}
                    width={pageWidth * (zoom / 100)}
                    rotate={rotation}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>

                {/* 右ページ */}
                {rightPage && (
                  <div
                    onClick={handleRightPageClick}
                    style={{
                      width: `${pageWidth * (zoom / 100)}px`,
                      height: `${pageHeight}px`,
                      backgroundColor: 'white',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      boxShadow: 'inset 15px 0 30px rgba(0,0,0,0.15)',
                      cursor: (rightPage && rightPage < totalPages) ? 'pointer' : 'default',
                      position: 'relative',
                      transformOrigin: 'left center',
                      transform: isFlipping && flipDirection === 'next'
                        ? 'rotateY(-180deg) translateZ(2px)'
                        : 'rotateY(0deg)',
                      transition: flipDirection !== null ? 'transform 1s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none',
                      zIndex: isFlipping && flipDirection === 'next' ? 10 : 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Page
                      pageNumber={rightPage}
                      width={pageWidth * (zoom / 100)}
                      rotate={rotation}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </Document>

        <div className="page-controls" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 8px',
          backgroundColor: 'rgba(245, 245, 245, 0.95)',
          borderTop: '1px solid #ddd'
        }}>
          <button
            className="page-nav-btn"
            onClick={handlePrevPage}
            disabled={internalPage <= 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: '500',
              color: internalPage <= 1 ? '#999' : '#333',
              backgroundColor: internalPage <= 1 ? '#e0e0e0' : 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: internalPage <= 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: internalPage <= 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <ChevronLeft size={18} />
            前のページ
          </button>

          <div className="page-info" style={{
            padding: '6px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            minWidth: '100px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <span>{leftPage}{rightPage ? `-${rightPage}` : ''} / {totalPages}</span>
          </div>

          <button
            className="page-nav-btn"
            onClick={handleNextPage}
            disabled={!rightPage || rightPage >= totalPages}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: '500',
              color: (!rightPage || rightPage >= totalPages) ? '#999' : '#333',
              backgroundColor: (!rightPage || rightPage >= totalPages) ? '#e0e0e0' : 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: (!rightPage || rightPage >= totalPages) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: (!rightPage || rightPage >= totalPages) ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            次のページ
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // テキストコンテンツの場合
  return (
    <div className="spread-viewer">
      <div className="spread-book-container" style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0',
        perspective: '3000px',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          borderRadius: '12px',
          overflow: 'visible',
          transformStyle: 'preserve-3d',
          maxWidth: '100%'
        }}>
          {/* 左ページ */}
          <div
            onClick={handleLeftPageClick}
            className="text-page"
            style={{
              width: `${pageWidth}px`,
              height: `${pageHeight}px`,
              padding: '20px',
              backgroundColor: 'white',
              overflow: 'auto',
              fontSize: '15px',
              lineHeight: '1.8',
              borderRight: '2px solid #ccc',
              boxShadow: 'inset -15px 0 30px rgba(0,0,0,0.15)',
              cursor: internalPage > 1 ? 'pointer' : 'default',
              position: 'relative',
              transformOrigin: 'right center',
              transform: isFlipping && flipDirection === 'prev'
                ? 'rotateY(180deg) translateZ(2px)'
                : 'rotateY(0deg)',
              transition: flipDirection !== null ? 'transform 1s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none',
              zIndex: isFlipping && flipDirection === 'prev' ? 10 : 1
            }}
          >
            {document.pages[leftPage - 1]?.content || ''}
          </div>

          {/* 右ページ */}
          {rightPage && rightPage <= document.pages.length && (
            <div
              onClick={handleRightPageClick}
              className="text-page"
              style={{
                width: `${pageWidth}px`,
                height: `${pageHeight}px`,
                padding: '20px',
                backgroundColor: 'white',
                overflow: 'auto',
                fontSize: '15px',
                lineHeight: '1.8',
                boxShadow: 'inset 15px 0 30px rgba(0,0,0,0.15)',
                cursor: (rightPage && rightPage < totalPages) ? 'pointer' : 'default',
                position: 'relative',
                transformOrigin: 'left center',
                transform: isFlipping && flipDirection === 'next'
                  ? 'rotateY(-180deg) translateZ(2px)'
                  : 'rotateY(0deg)',
                transition: flipDirection !== null ? 'transform 1s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none',
                zIndex: isFlipping && flipDirection === 'next' ? 10 : 1
              }}
            >
              {document.pages[rightPage - 1]?.content || ''}
            </div>
          )}
        </div>
      </div>

      <div className="page-controls" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 8px',
        backgroundColor: 'rgba(245, 245, 245, 0.95)',
        borderTop: '1px solid #ddd'
      }}>
        <button
          className="page-nav-btn"
          onClick={handlePrevPage}
          disabled={internalPage <= 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: '500',
            color: internalPage <= 1 ? '#999' : '#333',
            backgroundColor: internalPage <= 1 ? '#e0e0e0' : 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: internalPage <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: internalPage <= 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <ChevronLeft size={18} />
          前のページ
        </button>

        <div className="page-info" style={{
          padding: '6px 16px',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#333',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '6px',
          minWidth: '100px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <span>{leftPage}{rightPage ? `-${rightPage}` : ''} / {totalPages}</span>
        </div>

        <button
          className="page-nav-btn"
          onClick={handleNextPage}
          disabled={!rightPage || rightPage >= totalPages}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: '500',
            color: (!rightPage || rightPage >= totalPages) ? '#999' : '#333',
            backgroundColor: (!rightPage || rightPage >= totalPages) ? '#e0e0e0' : 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: (!rightPage || rightPage >= totalPages) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: (!rightPage || rightPage >= totalPages) ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          次のページ
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default SpreadView;
