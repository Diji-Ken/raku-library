import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Folder, FolderOpen, File, Image, FileText, Video, X, Search, Upload, Download, Book, Plus, FolderPlus, Trash2, Printer, MoreVertical, Edit3, FilePlus, MoveRight, FolderInput, Grid, Trash, RotateCcw } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { LibraryData, DocumentNode, FolderNode, CabinetNode, TreeNode, Breadcrumb, DeleteTarget, DragState } from './types';
import BookshelfView from './components/BookshelfView';
import SpreadView from './components/SpreadView';
import FolderListView from './components/FolderListView';
// react-pdf の Annotation/Text レイヤーは無効化しているため、CSSのインポートは不要です。
// （renderTextLayer={false}、renderAnnotationLayer={false}）

// PDF.js worker設定 - node_modulesから直接ロード
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// スタイル定義 - 楽々ライブラリ風デザイン
const styles = `
  .library-container {
    background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    position: relative;
  }

  .library-container::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 30vh;
    background: linear-gradient(180deg, rgba(210, 210, 210, 0.1) 0%, transparent 100%);
    pointer-events: none;
    z-index: 0;
  }

  .library-header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    color: #1a202c;
    padding: 20px 30px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    border-bottom: 1px solid rgba(0,0,0,0.05);
    position: relative;
    z-index: 10;
  }
  
  .library-title {
    font-size: 28px;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .library-main {
    display: flex;
    height: calc(100vh - 80px);
    gap: 0;
    position: relative;
    z-index: 1;
  }

  .document-spine {
    width: 20px;
    height: 20px;
    border-radius: 2px;
    box-shadow: inset -2px 0 4px rgba(0,0,0,0.2), 2px 2px 4px rgba(0,0,0,0.1);
    border: 1px solid rgba(0,0,0,0.1);
  }
  
  .content-area {
    flex: 1;
    background: transparent;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .content-header {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 30px;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  }
  
  .toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .toolbar-button {
    padding: 10px 20px;
    background: white;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    color: #2d3748;
  }

  .toolbar-button:hover {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    border-color: transparent;
  }
  
  .document-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
    padding: 20px;
    overflow-y: auto;
  }
  
  .document-card {
    background: white;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(0,0,0,0.05);
    position: relative;
    overflow: hidden;
  }

  .document-card:hover {
    transform: translateY(-8px) scale(1.03);
    box-shadow: 0 20px 40px rgba(102, 126, 234, 0.2);
  }

  .document-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--doc-color, #667eea);
    border-radius: 16px 0 0 16px;
  }

  .document-card::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(135deg, transparent, rgba(102, 126, 234, 0.05), transparent);
    transform: rotate(45deg);
    transition: all 0.5s ease;
    opacity: 0;
    pointer-events: none;
    z-index: 1;
  }

  .document-card:hover::after {
    opacity: 1;
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.9;
    }
  }

  /* Excel/Word用のテーブルスタイル */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
    font-size: 14px;
  }

  table th {
    background-color: #667eea;
    color: white;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    border: 1px solid #ddd;
  }

  table td {
    padding: 10px 12px;
    border: 1px solid #ddd;
    color: #1f2937;
  }

  table tr:nth-child(even) {
    background-color: #f9fafb;
  }

  table tr:hover {
    background-color: #f3f4f6;
  }

  .document-card > * {
    position: relative;
    z-index: 2;
  }
  
  .document-title {
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 8px;
    color: #1a202c;
    margin-left: 15px;
  }
  
  .document-pages {
    font-size: 12px;
    color: #7f8c8d;
    margin-left: 15px;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
  }
  
  .modal-content {
    background: linear-gradient(145deg, #ffffff, #f8f9fa);
    border-radius: 15px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    border: 2px solid #e9ecef;
  }
  
  .modal-header {
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #667eea;
  }
  
  .modal-title {
    font-size: 18px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  }
  
  .close-button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    transition: all 0.3s ease;
  }
  
  .close-button:hover {
    background: rgba(255,255,255,0.2);
    transform: scale(1.1);
  }
  
  .page-content {
    padding: 30px;
    min-height: 400px;
    background: white;
    font-size: 16px;
    line-height: 1.6;
    white-space: pre-wrap;
    color: #1a202c;
  }
  
  .page-navigation {
    background: linear-gradient(90deg, #ecf0f1 0%, #bdc3c7 100%);
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 2px solid #95a5a6;
  }
  
  .nav-button {
    background: linear-gradient(145deg, #3498db, #2980b9);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 25px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
    transition: all 0.3s ease;
    box-shadow: 3px 3px 10px rgba(0,0,0,0.2);
  }
  
  .nav-button:hover {
    background: linear-gradient(145deg, #2980b9, #3498db);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
  }
  
  .nav-button:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .page-indicator {
    background: linear-gradient(145deg, #ffffff, #f8f9fa);
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: bold;
    color: #1a202c;
    box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1);
    border: 1px solid #dee2e6;
  }
  
  @media (max-width: 768px) {
    .library-main {
      flex-direction: column;
      height: auto;
    }

    .document-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 15px;
      padding: 15px;
    }
    
    .modal-content {
      max-width: 95vw;
      max-height: 95vh;
    }
    
    .page-content {
      padding: 20px;
      font-size: 14px;
    }
  }

  /* 本棚UI用スタイル */
  .bookshelf-container {
    width: 100%;
    height: 100%;
    padding: 0;
    background: transparent;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* 本棚全体にグラデーション背景 */
  .bookshelf-container::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      #ffffff 0%,
      #e0e0e0 50%,
      #d0d0d0 100%
    );
    top: 0;
    left: 0;
    z-index: -1;
    pointer-events: none;
  }

  .bookshelf-header {
    padding: 32px 80px 24px;
    text-align: center;
    width: 100%;
    position: relative;
    z-index: 1;
  }

  .bookshelf-title {
    font-size: 36px;
    font-weight: 700;
    color: #1a202c;
    margin: 0;
    text-shadow: none;
    letter-spacing: 0.5px;
  }

  .bookshelf-count {
    font-size: 16px;
    color: #64748b;
    margin: 0;
    font-weight: 500;
    text-shadow: none;
  }

  .bookshelf-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 100px));
    gap: 20px;
    width: 100%;
    max-width: 1400px;
    justify-content: center;
    padding-bottom: 60px;
  }

  /* 本棚スタイル */
  .bookshelf-shelves {
    display: flex;
    flex-direction: column;
    gap: 60px;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 40px 60px;
    position: relative;
  }

  /* 本棚背景にグラデーション効果 */
  .bookshelf-shelves::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    box-shadow: 0px -200px 200px 0px rgba(210, 210, 210, 0.3) inset;
    top: 0;
    left: 0;
    z-index: -1;
    pointer-events: none;
  }

  .shelf-box {
    width: 100%;
    background: white;
    border: 3px solid #d1d5db;
    border-radius: 8px;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.08),
      inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }

  .shelf-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(240, 240, 240, 0.3) 100%
    );
    pointer-events: none;
  }

  .shelf-books {
    display: flex;
    gap: 12px;
    justify-content: flex-start;
    align-items: flex-end;
    padding: 24px;
    flex-wrap: wrap;
    width: 100%;
    min-height: 180px;
    position: relative;
    z-index: 1;
  }

  .shelf-books::-webkit-scrollbar {
    height: 8px;
  }

  .shelf-books::-webkit-scrollbar-track {
    background: transparent;
  }

  .shelf-books::-webkit-scrollbar-thumb {
    background: rgba(102, 126, 234, 0.3);
    border-radius: 4px;
  }

  .shelf-books::-webkit-scrollbar-thumb:hover {
    background: rgba(102, 126, 234, 0.5);
  }

  .bookshelf-empty {
    text-align: center;
    padding: 80px 20px;
    color: #4a5568;
  }

  .bookshelf-empty p {
    font-size: 20px;
    margin: 0 0 16px 0;
    font-weight: 500;
    text-shadow: none;
  }

  .bookshelf-empty-hint {
    font-size: 16px;
    color: #718096;
    text-shadow: none;
  }

  /* フォルダグリッド - 本棚スタイル */
  .folder-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 220px));
    gap: 40px;
    width: 100%;
    max-width: 1400px;
    justify-content: center;
    padding-bottom: 60px;
  }

  /* フォルダカード - 本の背表紙スタイル */
  .folder-card {
    background: #ffffff;
    border-radius: 14px;
    padding: 40px 25px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.05);
    position: relative;
    width: 220px;
    height: 360px;
    display: inline-block;
    color: #474747;
    overflow: visible;
  }

  .folder-card:hover {
    transform: scale(1.1);
    box-shadow: 0px 0px 40px rgba(69, 85, 81, 0.3);
  }

  .folder-icon {
    margin-bottom: 30px;
    transition: all 0.3s ease;
  }

  .folder-icon svg {
    width: 56px;
    height: 56px;
    color: #667eea;
  }

  .folder-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 16px;
    width: 100%;
    padding: 0 12px;
  }

  .folder-title {
    font-size: 18px;
    font-weight: 700;
    color: #474747;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }

  .folder-divider {
    width: 80px;
    height: 2px;
    background: #d5d5d5;
    border-radius: 2px;
  }

  .folder-count {
    font-size: 14px;
    color: #949494;
    font-weight: 600;
    opacity: 0.9;
  }

  /* 本のカード - 本の背表紙スタイル */
  .book-card {
    background: #ffffff;
    border-radius: 14px;
    padding: 20px 16px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.05);
    position: relative;
    width: auto;
    min-width: 60px;
    min-height: 200px;
    max-width: fit-content;
    height: auto;
    display: inline-block;
    color: #474747;
    overflow: visible;
  }

  .book-card:hover {
    transform: scale(1.05);
    box-shadow: 0px 0px 40px rgba(69, 85, 81, 0.3);
  }

  .book-title-vertical {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    margin: 0 auto;
    font-size: 13px;
    letter-spacing: 0.4em;
    line-height: 1.6em;
    font-weight: 500;
    font-family: "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif;
    color: #474747;
  }

  .book-spine-bottom {
    text-align: center;
    padding-top: 24px;
    border-top: 1px dashed #d5d5d5;
    margin-top: 24px;
    line-height: 1.6em;
    font-size: 11px;
    color: #949494;
    letter-spacing: 1px;
    line-height: 1.4em;
  }

  /* キャビネット内のフォルダセクション */
  .cabinet-sections {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    padding: 20px 40px 40px 40px;
    position: relative;
    z-index: 1;
  }

  .folder-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
  }

  .folder-section-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(210, 210, 210, 0.4);
  }

  .folder-section-title {
    font-size: 28px;
    font-weight: 700;
    color: #1a202c;
    margin: 0;
    text-shadow: none;
  }

  .folder-section-count {
    font-size: 18px;
    font-weight: 600;
    color: #4a5568;
    text-shadow: none;
  }

  .folder-section-empty {
    padding: 40px;
    text-align: center;
    color: #718096;
    font-size: 16px;
    font-style: italic;
  }

  .folder-shelves {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    position: relative;
    z-index: 1;
    width: 100%;
  }

  /* 見開き表示 */
  .spread-viewer {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background: transparent;
    height: 100%;
    min-height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .page-container {
    display: flex;
    gap: 0;
    background: white;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    position: relative;
    max-width: 95%;
  }

  .page {
    background: white;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .left-page {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
  }

  .right-page {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  /* 本の綴じ目 */
  .book-binding {
    width: 4px;
    background: linear-gradient(
      to right,
      rgba(0, 0, 0, 0.2),
      rgba(0, 0, 0, 0.1),
      rgba(0, 0, 0, 0.2)
    );
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.3);
    z-index: 10;
    position: relative;
  }

  /* テキストコンテンツ用 */
  .text-page {
    padding: 40px;
    font-size: 16px;
    line-height: 1.8;
    white-space: pre-wrap;
    width: 450px;
    min-height: 600px;
    max-height: 70vh;
    overflow-y: auto;
  }

  /* ページコントロール */
  .page-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-top: 20px;
    flex-shrink: 0;
  }

  .page-nav-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.95);
    border: none;
    border-radius: 8px;
    color: #667eea;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .page-nav-btn:hover:not(:disabled) {
    background: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  .page-nav-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .page-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    color: #1a202c;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  /* react-pageflip用のスタイル */
  .flipbook-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 100%;
    max-height: calc(100vh - 180px);
    flex: 1;
    perspective: 1500px;
    overflow: hidden;
  }

  .flip-book {
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .page-wrapper {
    background: white;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .page-content {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  .page-content canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .text-page {
    width: 100%;
    height: 100%;
    padding: 40px;
    overflow: auto;
    font-size: 16px;
    line-height: 1.8;
    color: #1a202c;
  }
`;

// モックデータ - 楽々ライブラリ風の階層構造
const mockData: LibraryData = {
  name: 'マイライブラリ',
  children: [
    {
      id: 'cabinet1',
      name: '技術資料',
      type: 'cabinet',
      expanded: true,
      children: [
        {
          id: 'folder1-1',
          name: 'プログラミング',
          type: 'folder',
          expanded: false,
          color: 'blue',
          children: [
            {
              id: 'd1',
              name: 'React入門ガイド',
              type: 'document',
              color: 'blue',
              pages: [
                { type: 'text', content: 'React入門ガイド\n\n第1章：はじめに\n\nReactは、ユーザーインターフェースを構築するためのJavaScriptライブラリです。Facebookによって開発され、現在では世界中で広く使用されています。\n\nコンポーネントベースのアーキテクチャにより、再利用可能なUIパーツを作成できます。' },
                { type: 'text', content: '第2章：コンポーネント\n\nReactの核心はコンポーネントです。コンポーネントは、UIを独立した再利用可能な部品に分割します。\n\n【コンポーネントの種類】\n・関数コンポーネント\n・クラスコンポーネント\n\nモダンなReact開発では、関数コンポーネントとHooksの使用が推奨されています。' },
                { type: 'text', content: '第3章：State と Props\n\nStateはコンポーネントの内部状態を管理します。Propsは親コンポーネントから子コンポーネントにデータを渡すために使用されます。\n\n【Stateの更新】\nuseState Hookを使用することで、関数コンポーネント内で状態管理が可能になります。' },
                { type: 'text', content: '第4章：Hooks\n\nReact Hooksは、関数コンポーネントで状態やライフサイクル機能を使用するための機能です。\n\n主なHooks:\n・useState\n・useEffect\n・useContext\n・useReducer\n・useCallback\n・useMemo' }
              ]
            },
            {
              id: 'd2',
              name: 'TypeScript基礎',
              type: 'document',
              color: 'purple',
              pages: [
                { type: 'text', content: 'TypeScript基礎\n\n目次\n1. TypeScriptとは\n2. 型システム\n3. インターフェース\n4. ジェネリクス\n5. デコレータ\n\nTypeScriptは、JavaScriptのスーパーセットです。' },
                { type: 'text', content: '1. TypeScriptとは\n\nTypeScriptは、JavaScriptに静的型付けを追加した言語です。Microsoftによって開発されました。\n\nコンパイル時に型チェックを行うことで、バグを事前に発見できます。' },
                { type: 'text', content: '2. 型システム\n\nTypeScriptの型システムは非常に強力です。\n\n基本型:\n・string\n・number\n・boolean\n・array\n・tuple\n・enum\n・any\n・void' }
              ]
            },
            {
              id: 'd2-1',
              name: 'JavaScript応用',
              type: 'document',
              color: 'yellow',
              pages: [
                { type: 'text', content: 'JavaScript応用\n\n第1章：非同期処理\n\nPromise、async/awaitを使った非同期プログラミングをマスターしましょう。' },
                { type: 'text', content: '第2章：モジュールシステム\n\nES Modulesを使ったコードの整理と再利用について学びます。' }
              ]
            },
            {
              id: 'd2-2',
              name: 'Python入門',
              type: 'document',
              color: 'green',
              pages: [
                { type: 'text', content: 'Python入門\n\nPythonは読みやすく、書きやすいプログラミング言語です。\n\nデータ分析、機械学習、Web開発など幅広い分野で使用されています。' },
                { type: 'text', content: '基本文法\n\n変数の宣言、制御構文、関数定義など、Pythonの基本を学びます。' }
              ]
            },
            {
              id: 'd2-3',
              name: 'Goプログラミング',
              type: 'document',
              color: 'blue',
              pages: [
                { type: 'text', content: 'Goプログラミング\n\nGoは、Googleが開発した高速でシンプルなプログラミング言語です。\n\n並行処理が得意で、サーバーサイド開発に最適です。' },
                { type: 'text', content: 'Goroutineとチャネル\n\nGoの強力な並行処理機能について学びます。' }
              ]
            },
            {
              id: 'd2-4',
              name: 'Rustで学ぶシステムプログラミング',
              type: 'document',
              color: 'red',
              pages: [
                { type: 'text', content: 'Rustで学ぶシステムプログラミング\n\nRustは、安全性とパフォーマンスを両立したシステムプログラミング言語です。\n\n所有権システムにより、メモリ安全性を保証します。' },
                { type: 'text', content: '所有権とライフタイム\n\nRustの最も重要な概念である所有権について深く学びます。' }
              ]
            },
            {
              id: 'd2-5',
              name: 'Webパフォーマンス最適化',
              type: 'document',
              color: 'purple',
              pages: [
                { type: 'text', content: 'Webパフォーマンス最適化\n\nWebサイトの読み込み速度を改善し、ユーザー体験を向上させる技術を学びます。\n\nCore Web Vitals、画像最適化、コード分割など。' },
                { type: 'text', content: 'パフォーマンス計測\n\nLighthouse、WebPageTestなどのツールを使った計測方法を紹介します。' }
              ]
            },
            {
              id: 'd2-6',
              name: 'データ構造とアルゴリズム',
              type: 'document',
              color: 'yellow',
              pages: [
                { type: 'text', content: 'データ構造とアルゴリズム\n\n効率的なプログラムを書くための基礎知識です。\n\n配列、リスト、木構造、グラフ、ソートアルゴリズムなど。' },
                { type: 'text', content: '計算量解析\n\nBig O記法を使った計算量の評価方法を学びます。' }
              ]
            },
            {
              id: 'd2-7',
              name: '関数型プログラミング入門',
              type: 'document',
              color: 'green',
              pages: [
                { type: 'text', content: '関数型プログラミング入門\n\n副作用のない純粋関数、イミュータブルなデータ構造など、関数型プログラミングの考え方を学びます。' },
                { type: 'text', content: '高階関数とクロージャ\n\nmap、filter、reduceなどの高階関数の使い方をマスターします。' }
              ]
            },
            {
              id: 'd2-8',
              name: 'テスト駆動開発実践',
              type: 'document',
              color: 'blue',
              pages: [
                { type: 'text', content: 'テスト駆動開発実践\n\nTDD（Test-Driven Development）は、テストを先に書いてからコードを実装する開発手法です。\n\nRed-Green-Refactorのサイクル。' },
                { type: 'text', content: 'ユニットテストの書き方\n\nJest、Mocha、Pytestなど、各言語のテストフレームワークを紹介します。' }
              ]
            },
            {
              id: 'd2-9',
              name: 'クリーンコード',
              type: 'document',
              color: 'red',
              pages: [
                { type: 'text', content: 'クリーンコード\n\n読みやすく、保守しやすいコードを書くための原則とテクニック。\n\n命名規則、関数の分割、コメントの書き方など。' },
                { type: 'text', content: 'リファクタリング\n\n既存のコードを改善するための手法を学びます。' }
              ]
            },
            {
              id: 'd2-10',
              name: 'デザインパターン',
              type: 'document',
              color: 'purple',
              pages: [
                { type: 'text', content: 'デザインパターン\n\nソフトウェア設計における典型的な問題に対する再利用可能な解決策。\n\nGoFの23パターンを中心に学びます。' },
                { type: 'text', content: '主要パターン\n\nSingleton、Factory、Observer、Strategy、Decoratorなど、よく使われるパターンを紹介します。' }
              ]
            }
          ]
        },
        {
          id: 'folder1-2',
          name: 'デザイン',
          type: 'folder',
          expanded: false,
          color: 'purple',
          children: [
            {
              id: 'd3',
              name: 'UI/UXガイドライン',
              type: 'document',
              color: 'green',
              pages: [
                { type: 'text', content: 'UI/UXガイドライン\n\n【基本原則】\n\n1. ユーザー中心設計\n2. 一貫性の維持\n3. フィードバックの提供\n4. エラー防止\n5. 柔軟性と効率性' },
                { type: 'text', content: 'カラーシステム\n\nプライマリカラー: #0066CC\nセカンダリカラー: #4CAF50\n背景色: #F5F5F5\nテキスト: #333333\n\nアクセシビリティを考慮したコントラスト比を確保してください。' }
              ]
            },
            {
              id: 'd3-1',
              name: 'ワイヤーフレーム',
              type: 'document',
              color: 'pink',
              pages: [
                { type: 'image', url: 'invalid-image-url.jpg' },
                { type: 'image', url: 'another-invalid-image.png' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'cabinet2',
      name: 'プロジェクト資料',
      type: 'cabinet',
      expanded: false,
      children: [
        {
          id: 'folder2-1',
          name: '2024年度',
          type: 'folder',
          expanded: false,
          color: 'green',
          children: [
            {
              id: 'd4',
              name: '埼玉県DX推進支援ネットワーク',
              type: 'document',
              color: 'orange',
              pdfUrl: '/files/埼玉県DX推進支援ネットワーク _ プロジェクト詳細.pdf',
              pages: []
            },
            {
              id: 'd5',
              name: 'DifyとLINE連携ガイド',
              type: 'document',
              color: 'blue',
              pdfUrl: '/files/【Dify×LINE】DifyとLINEを連携させよう　GASコード付き！【エージェント編】｜AI BOOTCAMP 公式note.pdf',
              pages: []
            },
            {
              id: 'd5-1',
              name: 'コンセプトメイキング攻略',
              type: 'document',
              color: 'purple',
              pdfUrl: '/files/吉原様_コンセプトメイキング攻略.pdf',
              pages: []
            },
            {
              id: 'd5-2',
              name: '履歴書01',
              type: 'document',
              color: 'green',
              pdfUrl: '/files/pdf_resume01.pdf',
              pages: []
            }
          ]
        }
      ]
    },
    {
      id: 'cabinet3',
      name: '会議資料',
      type: 'cabinet',
      expanded: false,
      children: [
        {
          id: 'folder3-1',
          name: '経営会議',
          type: 'folder',
          expanded: false,
          color: 'red',
          children: [
            {
              id: 'd6',
              name: '2024年度計画',
              type: 'document',
              color: 'yellow',
              pages: [
                { type: 'text', content: '2024年度 事業計画\n\n【重点施策】\n\n1. デジタルトランスフォーメーションの推進\n2. 顧客体験の向上\n3. 業務効率化\n4. 人材育成\n\n各施策について詳細を説明します。' },
                { type: 'text', content: '第1四半期の目標\n\n【4月】\n・新システムの導入準備\n・チーム体制の見直し\n\n【5月】\n・顧客満足度調査の実施\n・研修プログラムの開始\n\n【6月】\n・中間評価と軌道修正' },
                { type: 'text', content: '予算配分\n\nシステム開発: 40%（2,000万円）\nマーケティング: 30%（1,500万円）\n人材育成: 20%（1,000万円）\nその他: 10%（500万円）\n\n合計: 5,000万円' }
              ]
            }
          ]
        }
      ]
    }
  ]
};

const DocumentLibrary = () => {
  // LocalStorageからデータを読み込む（初回のみ）
  const loadFromLocalStorage = (): LibraryData => {
    try {
      const saved = localStorage.getItem('raku-library-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 基本的な構造チェック
        if (parsed && parsed.name && Array.isArray(parsed.children)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('LocalStorageからのデータ読み込みに失敗しました:', error);
    }
    return mockData;
  };

  const [treeData, setTreeData] = useState<LibraryData>(loadFromLocalStorage);
  const [selectedDocument, setSelectedDocument] = useState<DocumentNode | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('name-asc'); // 'name-asc', 'name-desc', 'date-asc', 'date-desc'
  const [currentCabinet, setCurrentCabinet] = useState<TreeNode | null>(null);
  const [currentFolder, setCurrentFolder] = useState<TreeNode | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderColor, setNewFolderColor] = useState<string>('blue'); // 新フォルダの色
  const [selectedParentForNewFolder, setSelectedParentForNewFolder] = useState<TreeNode | null>(null); // 新フォルダの親を選択
  const [showNewCabinetModal, setShowNewCabinetModal] = useState<boolean>(false);
  const [newCabinetName, setNewCabinetName] = useState<string>('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [selectedUploadFolder, setSelectedUploadFolder] = useState<TreeNode | null>(null); // アップロード先フォルダ
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentNode[]>([]);
  const [showFilePickerModal, setShowFilePickerModal] = useState<boolean>(false);
  const [pdfScale] = useState<number>(1.2);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false); // ドラッグ&ドロップ状態

  // 本棚UI用の状態
  const [viewMode, setViewMode] = useState<'bookshelf' | 'spread' | 'single'>('bookshelf'); // 表示モード
  const [zoom, setZoom] = useState<number>(100); // ズームレベル（%）
  const [rotation, setRotation] = useState<number>(0); // 回転角度（0, 90, 180, 270）
  const [isSpreadSidebarOpen, setIsSpreadSidebarOpen] = useState<boolean>(false); // 見開きビューのサイドバー開閉状態

  // 削除確認モーダルの状態
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null); // { type: 'folder' | 'document', id: string, name: string }

  // フォルダメニュー（⋮）の状態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // 名前変更モーダルの状態
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameTarget, setRenameTarget] = useState<{ type: 'cabinet' | 'folder' | 'document', id: string, currentName: string, currentColor?: string } | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [newColor, setNewColor] = useState<string>(''); // 選択された色

  // 複数ファイル追加モーダルの状態
  const [showMultiFileModal, setShowMultiFileModal] = useState<boolean>(false);
  const [selectedTargetFolder, setSelectedTargetFolder] = useState<string>(''); // folder ID
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isModalDragging, setIsModalDragging] = useState<boolean>(false);

  // ドキュメント移動モーダルの状態
  const [showMoveModal, setShowMoveModal] = useState<boolean>(false);
  const [moveTarget, setMoveTarget] = useState<{ documentId: string, documentName: string, currentFolderId: string } | null>(null);
  const [moveDestinationFolder, setMoveDestinationFolder] = useState<string>(''); // folder ID

  // 複数選択の状態
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());

  // ページサムネイル表示の状態
  const [showPageThumbnails, setShowPageThumbnails] = useState<boolean>(false);

  // 印刷オプションモーダルの状態
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printOption, setPrintOption] = useState<'current' | 'all' | 'spread' | 'range'>('current');
  const [printRangeStart, setPrintRangeStart] = useState<number>(1);
  const [printRangeEnd, setPrintRangeEnd] = useState<number>(1);

  // ナビゲーション用の状態
  const [selectedParentFolder, setSelectedParentFolder] = useState<TreeNode | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ name: 'ライブラリ', id: null }]);

  // サイドバー用の状態
  const [expandedCabinets, setExpandedCabinets] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // フォルダの色オプション
  const folderColorOptions = [
    { name: '青', value: 'blue', color: '#3b82f6' },
    { name: '緑', value: 'green', color: '#10b981' },
    { name: '赤', value: 'red', color: '#ef4444' },
    { name: '紫', value: 'purple', color: '#8b5cf6' },
    { name: '黄', value: 'yellow', color: '#f59e0b' },
  ];

  // ページめくりの状態管理
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    currentX: 0,
    translateX: 0,
    startTime: 0,
    lastX: 0,
    lastTime: 0
  });

  const viewerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // treeDataが変更されるたびにLocalStorageに保存
  useEffect(() => {
    try {
      // ファイルオブジェクトは除外してシリアライズ
      const saveData = (data: LibraryData): LibraryData => {
        const cleanNode = (node: TreeNode): TreeNode => {
          if (node.type === 'document') {
            const { file, originalFile, ...rest } = node;
            return rest as DocumentNode;
          }
          if (node.type === 'folder' || node.type === 'cabinet') {
            return {
              ...node,
              children: node.children.map(child => cleanNode(child))
            };
          }
          return node;
        };

        return {
          ...data,
          children: data.children.map(cabinet => cleanNode(cabinet) as CabinetNode)
        };
      };

      const dataToSave = saveData(treeData);
      localStorage.setItem('raku-library-data', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('LocalStorageへの保存に失敗しました:', error);
    }
  }, [treeData]);

  // URLから状態を復元する関数
  const restoreStateFromURL = () => {
    const hash = window.location.hash.slice(1); // # を除去
    if (!hash || hash === '/') {
      // トップページ
      setSelectedParentFolder(null);
      setCurrentFolder(null);
      setSelectedDocument(null);
      setBreadcrumbs([{ name: 'ライブラリ', id: null }]);
      return;
    }

    const parts = hash.split('/').filter(p => p);

    // /cabinet/:cabinetId
    if (parts.length >= 2 && parts[0] === 'cabinet') {
      const cabinetId = parts[1];
      const cabinet = treeData.children.find(c => c.id === cabinetId);
      if (cabinet) {
        setSelectedParentFolder(cabinet);
        setBreadcrumbs([
          { name: 'ライブラリ', id: null },
          { name: cabinet.name, id: cabinet.id }
        ]);

        // /cabinet/:cabinetId/folder/:folderId
        if (parts.length >= 4 && parts[2] === 'folder') {
          const folderId = parts[3];
          const folder = cabinet.children.find(f => f.id === folderId);
          if (folder) {
            setCurrentFolder(folder);
            setBreadcrumbs([
              { name: 'ライブラリ', id: null },
              { name: cabinet.name, id: cabinet.id },
              { name: folder.name, id: folder.id }
            ]);
          }
        }
      }
    }
  };

  // 初回ロード時とブラウザの戻る/進むボタン対応
  useEffect(() => {
    // 初回ロード時のみ実行
    restoreStateFromURL();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handlePopState = () => {
      restoreStateFromURL();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [treeData]);

  // ツリーの展開/折りたたみ
  const toggleNode = <T extends TreeNode>(nodeId: string, nodes: T[]): T[] => {
    return nodes.map(node => {
      if (node.id === nodeId && node.type !== 'document') {
        return { ...node, expanded: !node.expanded } as T;
      }
      if ('children' in node && node.children) {
        return { ...node, children: toggleNode(nodeId, node.children as TreeNode[]) } as T;
      }
      return node;
    }) as T[];
  };

  const handleToggle = (nodeId: string) => {
    setTreeData(prev => ({
      ...prev,
      children: toggleNode(nodeId, prev.children)
    }));
  };

  // 現在選択されているフォルダの全ドキュメントを取得
  const getAllDocuments = (nodes: TreeNode[]): DocumentNode[] => {
    let docs: DocumentNode[] = [];
    nodes.forEach(node => {
      if (node.type === 'document') {
        docs.push(node);
      } else if ('children' in node && node.children) {
        docs = [...docs, ...getAllDocuments(node.children as TreeNode[])];
      }
    });
    return docs;
  };

  // ノードIDから現在ツリー内の最新ノードを取得
  const findNodeById = (nodes: TreeNode[], nodeId: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if ('children' in node && node.children) {
        const found = findNodeById(node.children as TreeNode[], nodeId);
        if (found) return found;
      }
    }
    return null;
  };

  const allDocuments = useMemo(() => {
    console.log('allDocuments 再計算');
    console.log('currentFolder:', currentFolder);
    if (currentFolder) {
      const latestSelected = findNodeById(treeData.children, currentFolder.id);
      console.log('latestSelected:', latestSelected);
      const docs = latestSelected ? getAllDocuments([latestSelected]) : [];
      console.log('ドキュメント数:', docs.length);
      return docs;
    }
    const allDocs = getAllDocuments(treeData.children);
    console.log('全ドキュメント数:', allDocs.length);
    return allDocs;
  }, [currentFolder, treeData]);

  // 検索とソート機能
  useEffect(() => {
    // フィルタリング
    let result = searchQuery.trim() === ''
      ? [...allDocuments]
      : allDocuments.filter(doc =>
          doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.pages.some(page =>
            page.content && page.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );

    // ソート処理
    result.sort((a, b) => {
      if (sortOrder === 'name-asc') {
        return a.name.localeCompare(b.name, 'ja');
      } else if (sortOrder === 'name-desc') {
        return b.name.localeCompare(a.name, 'ja');
      } else if (sortOrder === 'date-asc') {
        // IDに含まれるタイムスタンプでソート（古い順）
        const timeA = a.id.includes('uploaded_') ? parseInt(a.id.split('_')[1]) : 0;
        const timeB = b.id.includes('uploaded_') ? parseInt(b.id.split('_')[1]) : 0;
        return timeA - timeB;
      } else if (sortOrder === 'date-desc') {
        // IDに含まれるタイムスタンプでソート（新しい順）
        const timeA = a.id.includes('uploaded_') ? parseInt(a.id.split('_')[1]) : 0;
        const timeB = b.id.includes('uploaded_') ? parseInt(b.id.split('_')[1]) : 0;
        return timeB - timeA;
      }
      return 0;
    });

    setFilteredDocuments(result);
  }, [searchQuery, allDocuments, sortOrder]);

  const currentDocuments = filteredDocuments;


  // ページめくり - マウス操作（改善版：フリック検知対応）
  const handleMouseDown = (e) => {
    e.preventDefault();
    const now = Date.now();
    setDragState({
      isDragging: true,
      startX: e.clientX,
      currentX: e.clientX,
      translateX: 0,
      startTime: now,
      lastX: e.clientX,
      lastTime: now
    });
  };

  const handleMouseMove = (e) => {
    if (!dragState.isDragging) return;
    e.preventDefault();

    const currentX = e.clientX;
    const diff = currentX - dragState.startX;
    const now = Date.now();

    setDragState(prev => ({
      ...prev,
      currentX: currentX,
      translateX: diff,
      lastX: currentX,
      lastTime: now
    }));
  };

  const handleMouseUp = (e) => {
    if (!dragState.isDragging) return;
    e.preventDefault();

    const now = Date.now();
    const timeDiff = now - dragState.lastTime;
    const distance = dragState.translateX;

    // 速度を計算（px/ms）
    const velocity = timeDiff > 0 ? Math.abs(distance) / timeDiff : 0;

    // フリック判定: 速度が0.5以上、または距離が50px以上
    const isFlick = velocity > 0.5 || Math.abs(distance) > 50;

    if (isFlick) {
      if (distance > 0 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else if (distance < 0 && currentPage < selectedDocument.pages.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    }

    setDragState({
      isDragging: false,
      startX: 0,
      currentX: 0,
      translateX: 0,
      startTime: 0,
      lastX: 0,
      lastTime: 0
    });
  };

  // タッチ操作（改善版：フリック検知対応）
  const handleTouchStart = (e) => {
    const now = Date.now();
    setDragState({
      isDragging: true,
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      translateX: 0,
      startTime: now,
      lastX: e.touches[0].clientX,
      lastTime: now
    });
  };

  const handleTouchMove = (e) => {
    if (!dragState.isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - dragState.startX;
    const now = Date.now();

    setDragState(prev => ({
      ...prev,
      currentX: currentX,
      translateX: diff,
      lastX: currentX,
      lastTime: now
    }));
  };

  const handleTouchEnd = () => {
    if (!dragState.isDragging) return;

    const now = Date.now();
    const timeDiff = now - dragState.lastTime;
    const distance = dragState.translateX;

    // 速度を計算（px/ms）
    const velocity = timeDiff > 0 ? Math.abs(distance) / timeDiff : 0;

    // フリック判定: 速度が0.5以上、または距離が50px以上
    const isFlick = velocity > 0.5 || Math.abs(distance) > 50;

    if (isFlick) {
      if (distance > 0 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else if (distance < 0 && currentPage < selectedDocument.pages.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    }

    setDragState({
      isDragging: false,
      startX: 0,
      currentX: 0,
      translateX: 0,
      startTime: 0,
      lastX: 0,
      lastTime: 0
    });
  };

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedDocument) return;

      if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < selectedDocument.pages.length - 1) {
        setCurrentPage(currentPage + 1);
      } else if (e.key === 'Escape') {
        closeDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDocument, currentPage]);

  // メニューの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId) {
        // メニューボタンやメニュー自体のクリックでない場合のみ閉じる
        const target = e.target as HTMLElement;
        const menuElement = target.closest('[data-menu-id]');
        const menuButton = target.closest('[data-menu-button]');

        if (!menuElement && !menuButton) {
          setOpenMenuId(null);
        }
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  const openDocument = (doc) => {
    const safePages = Array.isArray(doc.pages) && doc.pages.length > 0
      ? doc.pages
      : [{ type: 'text', content: 'このドキュメントにはページがありません。' }];
    setSelectedDocument({ ...doc, pages: safePages });
    setCurrentPage(0);
    setDragState({
      isDragging: false,
      startX: 0,
      currentX: 0,
      translateX: 0,
      startTime: 0,
      lastX: 0,
      lastTime: 0
    });
  };

  const closeDocument = () => {
    setSelectedDocument(null);
    setCurrentPage(0);
    setDragState({
      isDragging: false,
      startX: 0,
      currentX: 0,
      translateX: 0,
      startTime: 0,
      lastX: 0,
      lastTime: 0
    });
  };

  // ファイルダウンロード処理
  const handleDownload = () => {
    if (!selectedDocument || !selectedDocument.originalFile) {
      alert('ダウンロードできるファイルがありません。');
      return;
    }

    try {
      const file = selectedDocument.originalFile;
      const fileName = selectedDocument.name;

      // Blob URLを作成
      const blob = new Blob([file], { type: file.type });
      const url = URL.createObjectURL(blob);

      // ダウンロード用のアンカー要素を作成
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // クリーンアップ
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`ダウンロード成功: ${fileName}`);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      alert(`ダウンロードに失敗しました: ${error.message}`);
    }
  };

  // 印刷オプションモーダルを開く
  const openPrintModal = () => {
    if (!selectedDocument || !selectedDocument.pages || selectedDocument.pages.length === 0) {
      alert('印刷できるコンテンツがありません。');
      return;
    }
    setPrintRangeStart(1);
    setPrintRangeEnd(selectedDocument.pages.length);
    setShowPrintModal(true);
  };

  // 印刷処理を実行
  const executePrint = () => {
    if (!selectedDocument || !selectedDocument.pages || selectedDocument.pages.length === 0) {
      return;
    }

    try {
      let pagesToPrint: number[] = [];

      // 印刷するページを決定
      if (printOption === 'current') {
        pagesToPrint = [currentPage];
      } else if (printOption === 'all') {
        pagesToPrint = Array.from({ length: selectedDocument.pages.length }, (_, i) => i);
      } else if (printOption === 'spread') {
        // 見開きページ（現在のページと次のページ）
        pagesToPrint = [currentPage];
        if (currentPage + 1 < selectedDocument.pages.length) {
          pagesToPrint.push(currentPage + 1);
        }
      } else if (printOption === 'range') {
        // ページ範囲
        const start = Math.max(0, printRangeStart - 1);
        const end = Math.min(selectedDocument.pages.length - 1, printRangeEnd - 1);
        for (let i = start; i <= end; i++) {
          pagesToPrint.push(i);
        }
      }

      // 印刷用のウィンドウを作成
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('ポップアップがブロックされました。ポップアップを許可してください。');
        setShowPrintModal(false);
        return;
      }

      // 複数ページのコンテンツを生成
      const pageContents: string[] = [];

      for (const pageIndex of pagesToPrint) {
        const pageData = selectedDocument.pages[pageIndex];

        if (pageData.type === 'image' || pageData.url) {
          pageContents.push(`
            <div class="print-page">
              <div class="page-header">ページ ${pageIndex + 1}</div>
              <img src="${pageData.url}" alt="Page ${pageIndex + 1}" />
            </div>
          `);
        } else if (pageData.type === 'html') {
          pageContents.push(`
            <div class="print-page">
              <div class="page-header">ページ ${pageIndex + 1}</div>
              <div class="html-content">${pageData.content}</div>
            </div>
          `);
        } else if (pageData.type === 'text') {
          pageContents.push(`
            <div class="print-page">
              <div class="page-header">ページ ${pageIndex + 1}</div>
              <pre class="text-content">${pageData.content}</pre>
            </div>
          `);
        } else if (pageData.type === 'video') {
          pageContents.push(`
            <div class="print-page">
              <div class="page-header">ページ ${pageIndex + 1}</div>
              <p class="video-notice">動画ファイルは印刷できません</p>
            </div>
          `);
        } else {
          pageContents.push(`
            <div class="print-page">
              <div class="page-header">ページ ${pageIndex + 1}</div>
              <p>このファイル形式は印刷に対応していません</p>
            </div>
          `);
        }
      }

      // すべてのページを1つのHTMLドキュメントにまとめる
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${selectedDocument.name}</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: system-ui, -apple-system, sans-serif;
              }
              .print-page {
                page-break-after: always;
                page-break-inside: avoid;
                padding: 20px;
                min-height: 100vh;
                box-sizing: border-box;
              }
              .print-page:last-child {
                page-break-after: auto;
              }
              .page-header {
                text-align: center;
                color: #64748b;
                font-size: 12px;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e5e7eb;
              }
              img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
              }
              .text-content {
                white-space: pre-wrap;
                word-wrap: break-word;
                font-size: 14px;
                line-height: 1.75;
                color: #1f2937;
              }
              .html-content {
                font-size: 14px;
                line-height: 1.75;
                color: #1f2937;
              }
              .html-content table {
                border-collapse: collapse;
                width: 100%;
                margin: 16px 0;
              }
              .html-content table th {
                background-color: #667eea;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
                border: 1px solid #ddd;
              }
              .html-content table td {
                padding: 10px 12px;
                border: 1px solid #ddd;
              }
              .html-content table tr:nth-child(even) {
                background-color: #f9fafb;
              }
              .video-notice {
                text-align: center;
                color: #64748b;
                font-size: 16px;
                margin-top: 50px;
              }
              @media print {
                body { margin: 0; }
                .page-header { display: block; }
                .print-page {
                  padding: 15mm;
                  min-height: auto;
                }
              }
            </style>
          </head>
          <body>
            ${pageContents.join('\n')}
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // 画像の読み込みを待ってから印刷ダイアログを表示
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

      setShowPrintModal(false);
      console.log(`印刷ダイアログを表示: ${selectedDocument.name} (${pagesToPrint.length}ページ)`);
    } catch (error) {
      console.error('印刷エラー:', error);
      alert(`印刷に失敗しました: ${error.message}`);
      setShowPrintModal(false);
    }
  };

  // ナビゲーション関数
  const handleParentFolderClick = (folder) => {
    setSelectedParentFolder(folder);
    setCurrentFolder(null);
    setBreadcrumbs([
      { name: 'ライブラリ', id: null },
      { name: folder.name, id: folder.id }
    ]);
  };

  const handleChildFolderClick = (childFolder) => {
    setCurrentFolder(childFolder);
    if (selectedParentFolder) {
      setBreadcrumbs([
        { name: 'ライブラリ', id: null },
        { name: selectedParentFolder.name, id: selectedParentFolder.id },
        { name: childFolder.name, id: childFolder.id }
      ]);
    }
  };

  const handleBreadcrumbClick = (index) => {
    const crumb = breadcrumbs[index];
    if (index === 0) {
      // ライブラリルート
      setSelectedParentFolder(null);
      setCurrentFolder(null);
      setBreadcrumbs([{ name: 'ライブラリ', id: null }]);
    } else if (index === 1) {
      // 親フォルダ（キャビネット）
      const parent = treeData.children.find(n => n.id === crumb.id);
      if (parent) {
        handleParentFolderClick(parent);
      }
    }
    // index === 2 は現在のフォルダなので何もしない
  };

  const getBinderColor = (color) => {
    const colors = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500'
    };
    return colors[color] || 'bg-gray-500';
  };

  // CSS変数用の色値を取得する関数
  const getBinderColorValue = (color) => {
    const colors = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e',
      yellow: '#eab308',
      purple: '#a855f7',
      pink: '#ec4899',
      orange: '#f97316',
      gray: '#6b7280'
    };
    return colors[color] || colors.blue;
  };

  // 全フォルダを取得する関数
  const getAllFolders = () => {
    const folders = [];

    const collectFolders = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'folder') {
          folders.push(node);
        }
        if (node.children) {
          collectFolders(node.children);
        }
      }
    };

    if (treeData && treeData.children) {
      collectFolders(treeData.children);
    }

    return folders;
  };

  // ファイルアップロード処理 - 直接アップロード
  const handleFileUpload = async (event) => {
    console.log('handleFileUpload 呼び出し');
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    console.log('選択されたファイル数:', files.length);
    console.log('ファイル:', files);

    // デフォルトのフォルダを選択
    let targetFolder = null;
    if (currentFolder && currentFolder.type === 'folder') {
      targetFolder = currentFolder;
    } else {
      const allFolders = getAllFolders();
      console.log('利用可能なフォルダ数:', allFolders.length);
      if (allFolders.length > 0) {
        targetFolder = allFolders[0];
      }
    }

    if (!targetFolder) {
      alert('ファイルを保存するフォルダがありません。先にフォルダを作成してください。');
      return;
    }

    // ファイルを処理
    const newFiles = files.map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      color: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'][Math.floor(Math.random() * 7)]
    }));

    console.log('デフォルトフォルダを設定:', targetFolder);

    // ファイルピッカーモーダルを閉じる
    setShowFilePickerModal(false);

    // 直接アップロード処理を実行
    await processDroppedFiles(newFiles, targetFolder);

    // input要素をリセット
    event.target.value = '';
  };

  // ドラッグ&ドロップ - ドラッグオーバー時
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ドラッグ&ドロップ - ドラッグエンター時
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  };

  // ドラッグ&ドロップ - ドラッグリーブ時
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // content-areaから完全に出た時のみfalseに
    if (e.currentTarget === e.target) {
      setIsDraggingFile(false);
    }
  };

  // ドラッグ&ドロップ - ドロップ時
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    console.log('ドロップされたファイル数:', files.length);

    // デフォルトのフォルダを選択
    let targetFolder = null;
    if (currentFolder && currentFolder.type === 'folder') {
      targetFolder = currentFolder;
    } else {
      const allFolders = getAllFolders();
      if (allFolders.length > 0) {
        targetFolder = allFolders[0];
      }
    }

    if (!targetFolder) {
      alert('ファイルを保存するフォルダがありません。先にフォルダを作成してください。');
      return;
    }

    // ファイルを処理
    const newFiles = files.map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      color: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'][Math.floor(Math.random() * 7)]
    }));

    setUploadFiles(newFiles);
    setSelectedUploadFolder(targetFolder);

    // 直接アップロード処理を実行
    await processDroppedFiles(newFiles, targetFolder);
  };

  // ドロップされたファイルを処理する専用関数
  const processDroppedFiles = async (files, targetFolder) => {
    console.log('processDroppedFiles 開始');
    console.log('files:', files);
    console.log('targetFolder:', targetFolder);

    const newDocuments = [];

    try {
      for (const fileData of files) {
        const { file, name, color } = fileData;
        const fileType = file.type;

        console.log(`処理中: ${name} (${fileType})`);

        let pages = [];

        if (fileType.startsWith('image/')) {
          const imageUrl = URL.createObjectURL(file);
          pages = [{ type: 'image', url: imageUrl }];
        } else if (fileType === 'application/pdf') {
          pages = await loadPDFFromFile(file);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          // Word (.docx)
          pages = await loadWordFromFile(file);
        } else if (fileType === 'application/msword' || file.name.endsWith('.doc')) {
          // 古いWord (.doc)
          pages = [{ type: 'text', content: `古いWord形式 (.doc) のファイルです。\n\n.docx形式に変換してからアップロードしてください。\n\nまたはWordで開いて「名前を付けて保存」→「.docx」で保存し直してください。` }];
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
          // Excel (.xlsx)
          pages = await loadExcelFromFile(file);
        } else if (fileType === 'application/vnd.ms-excel' || file.name.endsWith('.xls')) {
          // 古いExcel (.xls) - xlsxライブラリは.xlsも読める
          pages = await loadExcelFromFile(file);
        } else if (fileType === 'text/csv' || file.name.endsWith('.csv')) {
          // CSV
          pages = await loadCSVFromFile(file);
        } else if (fileType === 'application/json' || file.name.endsWith('.json')) {
          // JSON
          pages = await loadJSONFromFile(file);
        } else if (fileType === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          // HTML
          pages = await loadHTMLFromFile(file);
        } else if (fileType === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
          // Markdown
          pages = await loadMarkdownFromFile(file);
        } else if (fileType.startsWith('video/')) {
          const videoUrl = URL.createObjectURL(file);
          pages = [{ type: 'video', url: videoUrl }];
        } else if (fileType.startsWith('text/')) {
          const text = await file.text();
          pages = [{ type: 'text', content: text }];
        } else {
          pages = [{ type: 'text', content: `ファイル: ${name}\n\nファイルタイプ: ${fileType}\n\nこのファイル形式は現在プレビューに対応していません。` }];
        }

        const newDoc = {
          id: `uploaded_${Date.now()}_${Math.random()}`,
          name,
          type: 'document',
          color,
          pages,
          originalFile: file,  // オリジナルファイルを保存（ダウンロード用）
          fileType: fileType   // ファイルタイプを保存
        };

        newDocuments.push(newDoc);
        console.log('ドキュメント作成:', newDoc);
      }

      console.log('全ドキュメント作成完了:', newDocuments.length);
      console.log('保存先フォルダID:', targetFolder.id);

      addDocumentsToFolder(targetFolder.id, newDocuments);

      // アップロード後、フォルダを展開
      // 注: currentFolderはaddDocumentsToFolder内で自動的に更新されます
      handleToggle(targetFolder.id);

      // 親フォルダも展開
      const parentCabinet = treeData.children.find(cabinet =>
        cabinet.children && cabinet.children.some(child => child.id === targetFolder.id)
      );
      if (parentCabinet && !parentCabinet.expanded) {
        handleToggle(parentCabinet.id);
      }

      console.log('ファイルアップロード成功！');
      alert(`${newDocuments.length}個のファイルを「${targetFolder.name}」フォルダに保存しました！`);

      setUploadFiles([]);
      setSelectedUploadFolder(null);
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert(`アップロードに失敗しました: ${error.message}`);
    }
  };

  // PDFファイルを読み込む関数
  const loadPDFFromFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pages = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        pages.push({
          type: 'image',
          url: canvas.toDataURL(),
          pageNumber: i
        });
      }
      
      return pages;
    } catch (error) {
      console.error('PDF読み込みエラー:', error);
      return [{ type: 'text', content: `PDFの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // Wordファイルを読み込む関数
  const loadWordFromFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      return [{
        type: 'html',
        content: html
      }];
    } catch (error) {
      console.error('Word読み込みエラー:', error);
      return [{ type: 'text', content: `Wordファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // Excelファイルを読み込む関数
  const loadExcelFromFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const pages = [];

      // 各シートをHTMLテーブルに変換
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(worksheet);

        pages.push({
          type: 'html',
          content: `<h2 style="margin-bottom: 16px; color: #1f2937;">${sheetName}</h2>${html}`,
          sheetName
        });
      });

      return pages;
    } catch (error) {
      console.error('Excel読み込みエラー:', error);
      return [{ type: 'text', content: `Excelファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // CSVファイルを読み込む関数
  const loadCSVFromFile = async (file) => {
    try {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string', raw: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(worksheet);

      return [{
        type: 'html',
        content: `<h2 style="margin-bottom: 16px; color: #1f2937;">CSVデータ</h2>${html}`
      }];
    } catch (error) {
      console.error('CSV読み込みエラー:', error);
      return [{ type: 'text', content: `CSVファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // JSONファイルを読み込む関数
  const loadJSONFromFile = async (file) => {
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const formattedJSON = JSON.stringify(jsonData, null, 2);

      return [{
        type: 'html',
        content: `
          <h2 style="margin-bottom: 16px; color: #1f2937;">JSONデータ</h2>
          <pre style="
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #1f2937;
          ">${formattedJSON}</pre>
        `
      }];
    } catch (error) {
      console.error('JSON読み込みエラー:', error);
      return [{ type: 'text', content: `JSONファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // HTMLファイルを読み込む関数
  const loadHTMLFromFile = async (file) => {
    try {
      const text = await file.text();
      return [{
        type: 'html',
        content: text
      }];
    } catch (error) {
      console.error('HTML読み込みエラー:', error);
      return [{ type: 'text', content: `HTMLファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };

  // Markdownファイルを読み込む関数（基本的な変換）
  const loadMarkdownFromFile = async (file) => {
    try {
      const text = await file.text();

      // シンプルなMarkdown→HTML変換
      let html = text
        // ヘッダー
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // 太字
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\_\_(.*?)\_\_/gim, '<strong>$1</strong>')
        // イタリック
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/\_(.*?)\_/gim, '<em>$1</em>')
        // リンク
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" style="color: #5dade2; text-decoration: underline;">$1</a>')
        // コードブロック
        .replace(/```([^`]+)```/gim, '<pre style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0;"><code>$1</code></pre>')
        .replace(/`([^`]+)`/gim, '<code style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
        // 改行をbrに変換
        .replace(/\n/gim, '<br>');

      return [{
        type: 'html',
        content: `<div style="line-height: 1.8;">${html}</div>`
      }];
    } catch (error) {
      console.error('Markdown読み込みエラー:', error);
      return [{ type: 'text', content: `Markdownファイルの読み込みに失敗しました: ${error.message}` }];
    }
  };


  // ファイルをドキュメントに変換
  const processUploadedFiles = async () => {
    console.log('processUploadedFiles 開始');
    console.log('uploadFiles:', uploadFiles);
    console.log('selectedUploadFolder:', selectedUploadFolder);

    if (!selectedUploadFolder) {
      alert('ファイルを保存するフォルダがありません。先にフォルダを作成してください。');
      console.error('選択されたフォルダがありません');
      return;
    }

    const newDocuments = [];

    try {
      for (const fileData of uploadFiles) {
        const { file, name, color } = fileData;
        const fileType = file.type;

        console.log(`処理中: ${name} (${fileType})`);

        let pages = [];

        if (fileType.startsWith('image/')) {
          const imageUrl = URL.createObjectURL(file);
          pages = [{ type: 'image', url: imageUrl }];
        } else if (fileType === 'application/pdf') {
          pages = await loadPDFFromFile(file);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          // Word (.docx)
          pages = await loadWordFromFile(file);
        } else if (fileType === 'application/msword' || file.name.endsWith('.doc')) {
          // 古いWord (.doc)
          pages = [{ type: 'text', content: `古いWord形式 (.doc) のファイルです。\n\n.docx形式に変換してからアップロードしてください。\n\nまたはWordで開いて「名前を付けて保存」→「.docx」で保存し直してください。` }];
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
          // Excel (.xlsx)
          pages = await loadExcelFromFile(file);
        } else if (fileType === 'application/vnd.ms-excel' || file.name.endsWith('.xls')) {
          // 古いExcel (.xls) - xlsxライブラリは.xlsも読める
          pages = await loadExcelFromFile(file);
        } else if (fileType === 'text/csv' || file.name.endsWith('.csv')) {
          // CSV
          pages = await loadCSVFromFile(file);
        } else if (fileType === 'application/json' || file.name.endsWith('.json')) {
          // JSON
          pages = await loadJSONFromFile(file);
        } else if (fileType === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          // HTML
          pages = await loadHTMLFromFile(file);
        } else if (fileType === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
          // Markdown
          pages = await loadMarkdownFromFile(file);
        } else if (fileType.startsWith('video/')) {
          const videoUrl = URL.createObjectURL(file);
          pages = [{ type: 'video', url: videoUrl }];
        } else if (fileType.startsWith('text/')) {
          const text = await file.text();
          pages = [{ type: 'text', content: text }];
        } else {
          pages = [{ type: 'text', content: `ファイル: ${name}\n\nファイルタイプ: ${fileType}\n\nこのファイル形式は現在プレビューに対応していません。` }];
        }

        const newDoc = {
          id: `uploaded_${Date.now()}_${Math.random()}`,
          name,
          type: 'document',
          color,
          pages,
          originalFile: file,  // オリジナルファイルを保存（ダウンロード用）
          fileType: fileType   // ファイルタイプを保存
        };

        newDocuments.push(newDoc);
        console.log('ドキュメント作成:', newDoc);
      }

      console.log('全ドキュメント作成完了:', newDocuments.length);
      console.log('保存先フォルダID:', selectedUploadFolder.id);

      addDocumentsToFolder(selectedUploadFolder.id, newDocuments);

      // アップロード後、フォルダを展開
      // 注: currentFolderはaddDocumentsToFolder内で自動的に更新されます
      handleToggle(selectedUploadFolder.id);

      // 親フォルダも展開
      const parentCabinet = treeData.children.find(cabinet =>
        cabinet.children && cabinet.children.some(child => child.id === selectedUploadFolder.id)
      );
      if (parentCabinet && !parentCabinet.expanded) {
        handleToggle(parentCabinet.id);
      }

      console.log('ファイルアップロード成功！');
      alert(`${newDocuments.length}個のファイルを「${selectedUploadFolder.name}」フォルダに保存しました！`);

      setUploadFiles([]);
      setSelectedUploadFolder(null);
      setShowUploadModal(false);
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert(`アップロードに失敗しました: ${error.message}`);
    }
  };

  // フォルダにドキュメントを追加
  const addDocumentsToFolder = (folderId, documents) => {
    console.log('addDocumentsToFolder 呼び出し');
    console.log('folderId:', folderId);
    console.log('documents:', documents);

    const addToNode = (nodes) => {
      return nodes.map(node => {
        if (node.id === folderId) {
          console.log(`フォルダ「${node.name}」にドキュメントを追加`);
          const updated = { ...node, children: [...(node.children || []), ...documents] };
          console.log('更新後の子要素数:', updated.children.length);
          return updated;
        }
        if (node.children) {
          return { ...node, children: addToNode(node.children) };
        }
        return node;
      });
    };

    setTreeData(prev => {
      const newTreeData = {
        ...prev,
        children: addToNode(prev.children)
      };
      console.log('treeData更新完了');
      console.log('新しいtreeData:', JSON.stringify(newTreeData, null, 2));

      // 更新されたフォルダを取得してcurrentFolderにも設定
      const updatedFolder = findNodeById(newTreeData.children, folderId);
      if (updatedFolder) {
        console.log('currentFolderを更新:', updatedFolder);
        setCurrentFolder(updatedFolder);
      }

      return newTreeData;
    });
  };

  // 新しいフォルダを作成
  const createNewFolder = () => {
    if (!newFolderName.trim()) return;
    if (!selectedParentForNewFolder) return;

    const newFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName,
      type: 'folder',
      expanded: false,
      color: newFolderColor,
      children: []
    };

    addDocumentsToFolder(selectedParentForNewFolder.id, [newFolder]);

    setNewFolderName('');
    setNewFolderColor('blue'); // 色をデフォルトに戻す
    setSelectedParentForNewFolder(null);
    setShowNewFolderModal(false);
  };

  // フォルダ作成モーダルを開く
  const openNewFolderModal = () => {
    // 現在選択中のキャビネットまたは最初のキャビネットを初期選択
    const initialParent = (selectedParentFolder && selectedParentFolder.type === 'cabinet')
      ? selectedParentFolder
      : (currentFolder && currentFolder.type === 'cabinet')
      ? currentFolder
      : treeData.children[0];

    setSelectedParentForNewFolder(initialParent);
    setShowNewFolderModal(true);
  };

  // キャビネット作成
  const createNewCabinet = () => {
    if (!newCabinetName.trim()) return;

    const newCabinet = {
      id: `cabinet_${Date.now()}`,
      name: newCabinetName,
      type: 'cabinet',
      expanded: false,
      children: []
    };

    setTreeData(prev => ({
      ...prev,
      children: [...prev.children, newCabinet]
    }));

    setNewCabinetName('');
    setShowNewCabinetModal(false);
  };

  // 削除確認ダイアログを開く
  const confirmDelete = (type, id, name) => {
    setDeleteTarget({ type, id, name });
    setShowDeleteModal(true);
  };

  // フォルダまたはドキュメントを削除
  const executeDelete = () => {
    if (!deleteTarget) return;

    const removeFromNode = (nodes) => {
      return nodes.map(node => {
        if (node.children) {
          const filteredChildren = node.children.filter(child => child.id !== deleteTarget.id);
          return {
            ...node,
            children: removeFromNode(filteredChildren)
          };
        }
        return node;
      }).filter(node => node.id !== deleteTarget.id);
    };

    setTreeData(prev => ({
      ...prev,
      children: removeFromNode(prev.children)
    }));

    // 削除したアイテムが現在選択されているものだった場合、選択を解除
    if (deleteTarget.type === 'folder' && currentFolder?.id === deleteTarget.id) {
      setCurrentFolder(null);
      setSelectedParentFolder(null);
      setBreadcrumbs([{ name: 'すべてのドキュメント', id: null }]);
    }
    if (deleteTarget.type === 'document' && selectedDocument?.id === deleteTarget.id) {
      setSelectedDocument(null);
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // 名前変更モーダルを開く
  const openRenameModal = (type: 'cabinet' | 'folder' | 'document', id: string, currentName: string) => {
    setRenameTarget({ type, id, currentName });
    setNewName(currentName);
    setShowRenameModal(true);
    setOpenMenuId(null); // メニューを閉じる
  };

  // 名前変更を実行
  const executeRename = () => {
    if (!renameTarget || !newName.trim()) return;

    const renameNode = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === renameTarget.id) {
          return { ...node, name: newName.trim() };
        }
        if (node.children) {
          return { ...node, children: renameNode(node.children) };
        }
        return node;
      });
    };

    setTreeData(prev => ({
      ...prev,
      children: renameNode(prev.children)
    }));

    // 現在選択中のフォルダやドキュメントの名前も更新
    if (renameTarget.type === 'folder' && currentFolder?.id === renameTarget.id) {
      setCurrentFolder({ ...currentFolder, name: newName.trim() });
    }
    if (renameTarget.type === 'document' && selectedDocument?.id === renameTarget.id) {
      setSelectedDocument({ ...selectedDocument, name: newName.trim() });
    }

    setShowRenameModal(false);
    setRenameTarget(null);
    setNewName('');
  };

  // ドキュメント移動モーダルを開く
  const openMoveModal = (documentId: string, documentName: string, currentFolderId: string) => {
    setMoveTarget({ documentId, documentName, currentFolderId });
    setMoveDestinationFolder('');
    setShowMoveModal(true);
    setOpenMenuId(null); // メニューを閉じる
  };

  // ドキュメント移動を実行
  const executeMoveDocument = () => {
    if (!moveTarget || !moveDestinationFolder) {
      return;
    }

    // 同じフォルダへの移動は不可
    if (moveTarget.currentFolderId === moveDestinationFolder) {
      alert('同じフォルダには移動できません。');
      return;
    }

    let documentToMove: DocumentNode | null = null;

    // 移動元からドキュメントを削除し、取得
    const removeDocument = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.type === 'folder' && node.children) {
          const doc = node.children.find(child => child.type === 'document' && child.id === moveTarget.documentId) as DocumentNode;
          if (doc) {
            documentToMove = doc;
          }
          const filteredChildren = node.children.filter(child => child.id !== moveTarget.documentId);
          return {
            ...node,
            children: removeDocument(filteredChildren)
          };
        }
        return node;
      });
    };

    // 移動先にドキュメントを追加
    const addDocumentToDestination = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.type === 'folder' && node.id === moveDestinationFolder) {
          return {
            ...node,
            children: [...(node.children || []), documentToMove!]
          };
        }
        if (node.children) {
          return {
            ...node,
            children: addDocumentToDestination(node.children)
          };
        }
        return node;
      });
    };

    // まず削除
    let updatedTree = {
      ...treeData,
      children: removeDocument(treeData.children)
    };

    // 次に追加
    if (documentToMove) {
      updatedTree = {
        ...updatedTree,
        children: addDocumentToDestination(updatedTree.children)
      };

      setTreeData(updatedTree);

      // 移動したドキュメントが現在選択中の場合は選択を解除
      if (selectedDocument?.id === moveTarget.documentId) {
        setSelectedDocument(null);
      }

      setShowMoveModal(false);
      setMoveTarget(null);
      setMoveDestinationFolder('');
    }
  };

  // 複数選択モード関連の関数
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // 選択モードを解除する時は選択をクリア
      setSelectedDocumentIds(new Set());
    }
  };

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocumentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const selectAllDocuments = () => {
    if (!currentFolder) return;
    const folderDocuments = (currentFolder.children?.filter(child => child.type === 'document') as DocumentNode[]) || [];
    const allIds = new Set(folderDocuments.map(doc => doc.id));
    setSelectedDocumentIds(allIds);
  };

  const deselectAllDocuments = () => {
    setSelectedDocumentIds(new Set());
  };

  const bulkDeleteDocuments = () => {
    if (selectedDocumentIds.size === 0) return;

    const confirmed = window.confirm(`${selectedDocumentIds.size}個のドキュメントを削除しますか？この操作は取り消せません。`);
    if (!confirmed) return;

    const removeMultipleDocuments = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.children) {
          const filteredChildren = node.children.filter(child => {
            if (child.type === 'document' && selectedDocumentIds.has(child.id)) {
              return false; // 選択されているドキュメントを除外
            }
            return true;
          });
          return {
            ...node,
            children: removeMultipleDocuments(filteredChildren)
          };
        }
        return node;
      });
    };

    setTreeData(prev => ({
      ...prev,
      children: removeMultipleDocuments(prev.children)
    }));

    setSelectedDocumentIds(new Set());
    setIsSelectionMode(false);
  };

  // ページ削除機能
  const deletePage = (pageIndex: number) => {
    if (!selectedDocument) return;

    const confirmed = window.confirm(`${pageIndex + 1}ページ目を削除しますか？この操作は取り消せません。`);
    if (!confirmed) return;

    // ページを削除
    const updatedPages = selectedDocument.pages.filter((_, index) => index !== pageIndex);

    if (updatedPages.length === 0) {
      alert('最後のページは削除できません。ドキュメント全体を削除してください。');
      return;
    }

    // ページ番号を再計算
    const updatedPagesWithNumbers = updatedPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1
    }));

    // TreeData内のドキュメントを更新
    const updateDocument = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.type === 'document' && node.id === selectedDocument.id) {
          return {
            ...node,
            pages: updatedPagesWithNumbers
          } as DocumentNode;
        }
        if (node.children) {
          return {
            ...node,
            children: updateDocument(node.children)
          };
        }
        return node;
      });
    };

    setTreeData(prev => ({
      ...prev,
      children: updateDocument(prev.children)
    }));

    // 選択中のドキュメントも更新
    setSelectedDocument({
      ...selectedDocument,
      pages: updatedPagesWithNumbers
    });

    // 現在のページが削除されたページより後ろにある場合、ページ番号を調整
    if (currentPage >= pageIndex && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else if (currentPage >= updatedPagesWithNumbers.length) {
      setCurrentPage(updatedPagesWithNumbers.length - 1);
    }
  };

  // 検索フィルタリング関数
  const filterTreeBySearch = useMemo(() => {
    if (!searchQuery.trim()) {
      return treeData;
    }

    const query = searchQuery.toLowerCase();

    const filterNode = (node: TreeNode): TreeNode | null => {
      const nameMatch = node.name.toLowerCase().includes(query);

      if (node.type === 'document') {
        return nameMatch ? node : null;
      }

      if (node.type === 'folder' || node.type === 'cabinet') {
        const filteredChildren = node.children
          .map(child => filterNode(child))
          .filter((child): child is TreeNode => child !== null);

        // フォルダ名がマッチするか、子要素にマッチがある場合に表示
        if (nameMatch || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
            expanded: true // 検索時は自動展開
          };
        }
      }

      return null;
    };

    const filteredCabinets = treeData.children
      .map(cabinet => filterNode(cabinet))
      .filter((cabinet): cabinet is CabinetNode => cabinet !== null);

    return {
      ...treeData,
      children: filteredCabinets
    };
  }, [treeData, searchQuery]);

  // 複数ファイル追加モーダルを開く
  const openMultiFileModal = (folderId?: string) => {
    const allFolders = getAllFolders();
    if (allFolders.length === 0) {
      alert('ファイルを保存するフォルダがありません。先にフォルダを作成してください。');
      return;
    }

    // フォルダIDが指定されている場合はそれを使用、なければ現在のフォルダまたは最初のフォルダ
    const targetId = folderId || currentFolder?.id || allFolders[0].id;
    setSelectedTargetFolder(targetId);
    setSelectedFiles([]);
    setShowMultiFileModal(true);
    setOpenMenuId(null); // メニューを閉じる
  };

  // ファイル選択ハンドラー
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // ファイルをリストから削除
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ドラッグ&ドロップハンドラー（モーダル用）
  const handleFileDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalDragging(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalDragging(false);
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...droppedFiles]);
  };

  // 複数ファイルをアップロード
  const executeMultiFileUpload = async () => {
    if (selectedFiles.length === 0 || !selectedTargetFolder) return;

    const allFolders = getAllFolders();
    const targetFolder = allFolders.find(f => f.id === selectedTargetFolder);

    if (!targetFolder) {
      alert('対象フォルダが見つかりません');
      return;
    }

    const newFiles = selectedFiles.map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      color: ['red', 'blue', 'green', 'yellow', 'purple'][Math.floor(Math.random() * 5)]
    }));

    await processDroppedFiles(newFiles, targetFolder);

    // モーダルを閉じて状態をリセット
    setShowMultiFileModal(false);
    setSelectedFiles([]);
    setSelectedTargetFolder('');
  };

  // エクスポート機能
  const exportLibrary = () => {
    const dataStr = JSON.stringify(treeData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `library-export-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // データリセット機能
  const resetLibrary = () => {
    const confirmed = window.confirm('すべてのデータをリセットして初期状態に戻しますか？\nこの操作は取り消せません。');
    if (!confirmed) return;

    // LocalStorageをクリア
    localStorage.removeItem('raku-library-data');

    // 初期データに戻す
    setTreeData(mockData);
    setSelectedDocument(null);
    setCurrentFolder(null);
    setSelectedParentFolder(null);
    setBreadcrumbs([{ name: 'ライブラリ', id: null }]);
    setSearchQuery('');

    alert('データを初期状態にリセットしました。');
  };

  // インポート機能
  const importLibrary = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        setTreeData(importedData);
        alert('ライブラリをインポートしました！');
      } catch (error) {
        alert('インポートに失敗しました。JSONファイルを確認してください。');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  // 個別ファイル選択
  const handleIndividualFileUpload = () => {
    console.log('個別ファイル選択が開始されました');
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    // すべてのファイル形式を許可
    input.accept = '.pdf,.jpg,.jpeg,.png,.heic,.txt,.mp4,.mov,.avi,.webp,.gif,.bmp,.docx,.doc,.xlsx,.xls,.csv,.json,.html,.htm,.md,.markdown';
    input.onchange = handleFileUpload;
    input.click();
    setShowFilePickerModal(false);
  };

  // フォルダ一括選択 - 直接アップロード
  const handleFolderUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);

      if (files.length === 0) return;

      // デフォルトのフォルダを選択
      let targetFolder = null;
      if (currentFolder && currentFolder.type === 'folder') {
        targetFolder = currentFolder;
      } else {
        const allFolders = getAllFolders();
        if (allFolders.length > 0) {
          targetFolder = allFolders[0];
        }
      }

      if (!targetFolder) {
        alert('ファイルを保存するフォルダがありません。先にフォルダを作成してください。');
        return;
      }

      const newFiles = files.map(file => ({
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        color: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'][Math.floor(Math.random() * 7)]
      }));

      // ファイルピッカーモーダルを閉じる
      setShowFilePickerModal(false);

      // 直接アップロード処理を実行
      await processDroppedFiles(newFiles, targetFolder);
    };
    input.click();
    setShowFilePickerModal(false);
  };

  // 本棚UI用のハンドラー
  const handleBookClick = async (doc: DocumentNode) => {
    // pdfUrlがある場合は、react-pdfで表示するためにそのまま渡す
    if (doc.pdfUrl && doc.pages.length === 0) {
      // PDFファイルの場合は、pdfUrlをそのまま使ってreact-pdfで表示
      // ページ情報は後でreact-pdf側で取得
      setSelectedDocument(doc);
    } else {
      setSelectedDocument(doc);
    }

    setCurrentPage(0);
    setViewMode('spread'); // 見開き表示に切り替え
  };

  const handleBackToBookshelf = () => {
    setViewMode('bookshelf');
    setSelectedDocument(null);
    setZoom(100);
    setRotation(0);
    setShowPageThumbnails(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleToggleViewMode = () => {
    setViewMode(prev => prev === 'spread' ? 'single' : 'spread');
  };

  // ドキュメントが所属するフォルダを探す関数
  const findDocumentFolder = (documentId) => {
    let result = null;

    const searchNode = (nodes, parentPath = []) => {
      for (const node of nodes) {
        if (node.type === 'folder' && node.children) {
          const hasDocument = node.children.some(child => child.id === documentId);
          if (hasDocument) {
            result = { folder: node, path: [...parentPath, node] };
            return true;
          }
          if (searchNode(node.children, [...parentPath, node])) {
            return true;
          }
        }
      }
      return false;
    };

    if (treeData && treeData.children) {
      searchNode(treeData.children);
    }

    return result;
  };


  // 検索フィルタリング（改善版 - ネストされた要素も検索）
  const filteredCabinets = useMemo(() => {
    return filterTreeBySearch.children;
  }, [filterTreeBySearch]);

  const filteredFolders = useMemo(() => {
    if (!selectedParentFolder) return [];
    if (!searchQuery.trim()) {
      return selectedParentFolder.children?.filter(c => c.type === 'folder') || [];
    }
    // filterTreeBySearchから該当するキャビネットを取得
    const filteredCabinet = filterTreeBySearch.children.find(c => c.id === selectedParentFolder.id);
    if (!filteredCabinet) return [];
    return (filteredCabinet.children?.filter(child =>
      child.type === 'folder'
    ) || []);
  }, [selectedParentFolder, searchQuery, filterTreeBySearch]);

  return (
    <>
      <style>{styles}</style>
      <div className="library-container">
        {/* ヘッダー - 常に表示（SpreadView時のみ非表示） */}
        {viewMode !== 'spread' && (
          <header style={{
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            padding: '16px 32px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* タイトル */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Book style={{ width: '32px', height: '32px', color: '#667eea' }} />
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
              }}>楽々ライブラリ</h1>
            </div>

            {/* 検索バー */}
            <div style={{
              flex: 1,
              maxWidth: '500px',
              margin: '0 24px',
              position: 'relative'
            }}>
              <input
                type="text"
                placeholder="キャビネット、フォルダ、ドキュメントを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: 'white',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <Search style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#9ca3af',
                pointerEvents: 'none'
              }} />
            </div>

            {/* アクションボタン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => openMultiFileModal()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(102, 126, 234, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#764ba2';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#667eea';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.2)';
                }}
              >
                <Plus style={{ width: '18px', height: '18px' }} />
                ファイルを追加
              </button>

              <button
                onClick={openNewFolderModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f1ff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FolderPlus style={{ width: '18px', height: '18px' }} />
                フォルダ作成
              </button>

              <button
                onClick={() => setShowNewCabinetModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  color: '#8b5cf6',
                  border: '2px solid #8b5cf6',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#faf5ff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Book style={{ width: '18px', height: '18px' }} />
                親フォルダ作成
              </button>

              <button
                onClick={exportLibrary}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <Download style={{ width: '18px', height: '18px' }} />
                エクスポート
              </button>

              <button
                onClick={resetLibrary}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  color: '#ef4444',
                  border: '2px solid #fee2e2',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#fee2e2';
                }}
              >
                <RotateCcw style={{ width: '18px', height: '18px' }} />
                リセット
              </button>

              {/* ソート選択 */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'white',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <option value="name-asc">名前順 (A → Z)</option>
                <option value="name-desc">名前順 (Z → A)</option>
                <option value="date-asc">日付順 (古い順)</option>
                <option value="date-desc">日付順 (新しい順)</option>
              </select>
            </div>
          </div>
        </header>
        )}

        <div className="library-main" style={{
          height: viewMode === 'spread' ? '100vh' : 'calc(100vh - 80px)'
        }}>
          {/* メインコンテンツ - 改善版 + ドラッグ&ドロップ対応 */}
          <div
            className="content-area"
            style={{
              borderRadius: '16px',
              border: (currentCabinet || currentFolder || (selectedDocument && viewMode === 'spread')) ? 'none' : (isDraggingFile ? '3px dashed #8b5cf6' : '1px solid rgba(255, 255, 255, 0.3)'),
              margin: (currentCabinet || currentFolder || (selectedDocument && viewMode === 'spread')) ? '0' : '0 24px 24px 0',
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: (currentCabinet || currentFolder || (selectedDocument && viewMode === 'spread')) ? 'transparent' : (isDraggingFile ? 'rgba(139, 92, 246, 0.05)' : 'transparent'),
              transition: 'all 0.3s ease'
            }}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedDocument && viewMode === 'spread' ? (
              /* 見開きビュー専用レンダリング */
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                height: '100vh',
                width: '100vw',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 1000,
                backgroundColor: '#f9fafb'
              }}>
                {/* サイドバー */}
                {isSpreadSidebarOpen && (
                  <div style={{
                    width: '280px',
                    flexShrink: 0,
                    backgroundColor: '#f8f9fa',
                    borderRight: '2px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    overflowY: 'auto'
                  }}>
                    {/* サイドバーヘッダー */}
                    <div style={{
                      padding: '20px',
                      borderBottom: '2px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <h2 style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#1a202c',
                          marginBottom: '8px'
                        }}>ライブラリ</h2>
                        <p style={{
                          fontSize: '13px',
                          color: '#64748b'
                        }}>{treeData.children.length}個のキャビネット</p>
                      </div>
                      {/* サイドバートグルボタン（サイドバー内） */}
                      <button
                        onClick={() => setIsSpreadSidebarOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px',
                          backgroundColor: 'white',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          color: '#374151',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>

                    {/* キャビネット・フォルダツリー */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '12px'
                    }}>
                      {filteredCabinets.map((cabinet, index) => {
                        const folderCount = cabinet.children?.filter(child => child.type === 'folder').length || 0;
                        const cabinetColors = [
                          '#667eea', '#f59e0b', '#10b981', '#ef4444',
                          '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
                        ];
                        const cabinetColor = cabinetColors[index % cabinetColors.length];

                        const isExpanded = expandedCabinets.has(cabinet.id);

                        return (
                          <div key={cabinet.id} style={{ marginBottom: '4px' }}>
                            {/* キャビネット項目 */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 12px',
                                backgroundColor: isExpanded ? '#e8eaf6' : 'transparent',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: isExpanded ? '1px solid #667eea' : '1px solid transparent'
                              }}
                              onClick={() => {
                                const newExpanded = new Set(expandedCabinets);
                                if (isExpanded) {
                                  newExpanded.delete(cabinet.id);
                                } else {
                                  newExpanded.add(cabinet.id);
                                }
                                setExpandedCabinets(newExpanded);
                              }}
                              onMouseEnter={(e) => {
                                if (!isExpanded) {
                                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isExpanded) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <ChevronRight
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  marginRight: '8px',
                                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s',
                                  color: '#667eea'
                                }}
                              />
                              <Book
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  marginRight: '8px',
                                  color: cabinetColor
                                }}
                              />
                              <span style={{
                                flex: 1,
                                fontSize: '14px',
                                fontWeight: isExpanded ? '600' : '500',
                                color: '#1a202c'
                              }}>
                                {cabinet.name}
                              </span>
                              <span style={{
                                fontSize: '12px',
                                color: '#9ca3af',
                                marginLeft: '8px'
                              }}>
                                {folderCount}
                              </span>
                            </div>

                            {/* フォルダリスト */}
                            {isExpanded && cabinet.children && cabinet.children.length > 0 && (
                              <div style={{
                                marginLeft: '32px',
                                marginTop: '4px',
                                borderLeft: '2px solid #e5e7eb',
                                paddingLeft: '8px'
                              }}>
                                {cabinet.children.map((folder: FolderNode) => {
                                  const isSelected = selectedFolderId === folder.id;
                                  // フォルダの色を取得（デフォルトは黄色）
                                  const folderColorMap: Record<string, string> = {
                                    blue: '#3b82f6',
                                    green: '#10b981',
                                    red: '#ef4444',
                                    purple: '#8b5cf6',
                                    yellow: '#f59e0b',
                                  };
                                  const folderColor = folderColorMap[folder.color || 'yellow'] || '#f59e0b';

                                  return (
                                    <div
                                      key={folder.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '8px 10px',
                                        backgroundColor: isSelected ? '#e8eaf6' : 'transparent',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        marginBottom: '2px',
                                        border: isSelected ? '1px solid #667eea' : '1px solid transparent',
                                        transition: 'all 0.2s'
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFolderId(folder.id);
                                        setCurrentFolder(folder);
                                        setSelectedDocument(null);
                                        setViewMode('bookshelf');
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelected) {
                                          e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                      }}
                                    >
                                      <Folder
                                        style={{
                                          width: '16px',
                                          height: '16px',
                                          marginRight: '8px',
                                          color: folderColor
                                        }}
                                      />
                                      <span style={{
                                        flex: 1,
                                        fontSize: '13px',
                                        fontWeight: isSelected ? '600' : '400',
                                        color: '#374151'
                                      }}>
                                        {folder.name}
                                      </span>
                                      <span style={{
                                        fontSize: '11px',
                                        color: '#9ca3af'
                                      }}>
                                        {folder.children?.length || 0}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 見開きビューアー */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  width: '100%',
                  height: '100%',
                  position: 'relative'
                }}>
                  {/* サイドバートグルボタン（サイドバーが閉じている時のみ表示） */}
                  {!isSpreadSidebarOpen && (
                    <button
                      onClick={() => setIsSpreadSidebarOpen(true)}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#374151',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                      </svg>
                    </button>
                  )}

                  <div style={{
                    flex: 1,
                    overflow: 'hidden',
                    flexShrink: 0,
                    width: '100%',
                    height: '100%'
                  }}>
                    <SpreadView
                      document={selectedDocument}
                      currentPage={currentPage}
                      zoom={zoom}
                      rotation={rotation}
                      onPageChange={setCurrentPage}
                      sidebarWidth={isSpreadSidebarOpen ? 280 : 0}
                    />
                  </div>

                  {/* ページサムネイル表示パネル */}
                  {showPageThumbnails && (selectedDocument.pdfUrl || selectedDocument.originalFile) && (
                    <div style={{
                      height: '520px',
                      borderTop: '2px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                      overflowY: 'auto',
                      padding: '16px',
                      boxSizing: 'border-box',
                      position: 'relative',
                      flexShrink: 0
                    }}>
                      <Document
                        file={(() => {
                          let pdfSource = selectedDocument.originalFile;
                          if (!pdfSource && selectedDocument.pdfUrl) {
                            const parts = selectedDocument.pdfUrl.split('/');
                            const encodedParts = parts.map((part, index) =>
                              index < parts.length - 1 ? part : encodeURIComponent(part)
                            );
                            pdfSource = encodedParts.join('/');
                          }
                          return pdfSource;
                        })()}
                        onLoadSuccess={({ numPages }) => {
                          // ページ数を取得したら、selectedDocumentを更新
                          setSelectedDocument(prev => prev ? { ...prev, numPages } : prev);
                        }}
                      >
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                          gap: '16px',
                          alignContent: 'start'
                        }}>
                          {Array.from({ length: selectedDocument.numPages || 0 }, (_, index) => (
                            <div
                              key={index}
                              style={{
                                position: 'relative',
                                border: currentPage === index + 1 ? '3px solid #667eea' : '2px solid #e5e7eb',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                backgroundColor: 'white',
                                boxShadow: currentPage === index + 1 ? '0 4px 12px rgba(102, 126, 234, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                              }}
                              onClick={() => setCurrentPage(index + 1)}
                              onMouseEnter={(e) => {
                                if (currentPage !== index + 1) {
                                  e.currentTarget.style.borderColor = '#667eea';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (currentPage !== index + 1) {
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }
                              }}
                            >
                              {/* PDFページサムネイル */}
                              <div style={{
                                aspectRatio: '3/4',
                                backgroundColor: '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                              }}>
                                <Page
                                  pageNumber={index + 1}
                                  width={150}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                              </div>

                              {/* ページ番号 */}
                              <div style={{
                                padding: '8px',
                                textAlign: 'center',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: currentPage === index + 1 ? '#667eea' : '#374151',
                                backgroundColor: currentPage === index + 1 ? '#f3f4f6' : 'white'
                              }}>
                                {index + 1}ページ
                              </div>
                            </div>
                          ))}
                        </div>
                      </Document>
                    </div>
                  )}

                  {/* テキストドキュメントのページ一覧 */}
                  {showPageThumbnails && !(selectedDocument.pdfUrl || selectedDocument.originalFile) && (
                    <div style={{
                      height: '520px',
                      borderTop: '2px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                      overflowY: 'auto',
                      padding: '16px',
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: '16px',
                        alignContent: 'start'
                      }}>
                        {selectedDocument.pages.map((page, index) => (
                          <div
                            key={index}
                            style={{
                              position: 'relative',
                              border: currentPage === index ? '3px solid #667eea' : '2px solid #e5e7eb',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: 'white',
                              boxShadow: currentPage === index ? '0 4px 12px rgba(102, 126, 234, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                              transition: 'all 0.2s',
                              cursor: 'pointer'
                            }}
                            onClick={() => setCurrentPage(index)}
                            onMouseEnter={(e) => {
                              if (currentPage !== index) {
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentPage !== index) {
                                e.currentTarget.style.borderColor = '#e5e7eb';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            {/* ページサムネイル */}
                            <div style={{
                              aspectRatio: '3/4',
                              backgroundColor: '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden'
                            }}>
                              {page.thumbnail ? (
                                <img
                                  src={page.thumbnail}
                                  alt={`Page ${index + 1}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                  }}
                                />
                              ) : (
                                <FileText style={{ width: '48px', height: '48px', color: '#9ca3af' }} />
                              )}
                            </div>

                            {/* ページ番号 */}
                            <div style={{
                              padding: '8px',
                              textAlign: 'center',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: currentPage === index ? '#667eea' : '#374151',
                              backgroundColor: currentPage === index ? '#f3f4f6' : 'white'
                            }}>
                              {index + 1}ページ
                            </div>

                            {/* 削除ボタン */}
                            {selectedDocument.pages.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePage(index);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ef4444',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                  transition: 'all 0.2s',
                                  opacity: 0.9
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '0.9';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <Trash style={{ width: '14px', height: '14px', color: 'white' }} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* サイドバー + 本棚レイアウト */
              <div style={{
                display: 'flex',
                height: '100%',
                overflow: 'hidden'
              }}>
                {/* サイドバー */}
                <div style={{
                  width: '280px',
                  flexShrink: 0,
                  backgroundColor: '#f8f9fa',
                  borderRight: '2px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}>
                  {/* サイドバーヘッダー */}
                  <div style={{
                    padding: '20px',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <h2 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1a202c',
                      marginBottom: '8px'
                    }}>ライブラリ</h2>
                    <p style={{
                      fontSize: '13px',
                      color: '#64748b'
                    }}>{treeData.children.length}個のキャビネット</p>
                  </div>

                  {/* キャビネット・フォルダツリー */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px'
                  }}>
                    {filteredCabinets.map((cabinet, index) => {
                      const folderCount = cabinet.children?.filter(child => child.type === 'folder').length || 0;
                      const cabinetColors = [
                        '#667eea', '#f59e0b', '#10b981', '#ef4444',
                        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
                      ];
                      const cabinetColor = cabinetColors[index % cabinetColors.length];

                      const isExpanded = expandedCabinets.has(cabinet.id);

                      return (
                        <div key={cabinet.id} style={{ marginBottom: '4px' }}>
                          {/* キャビネット項目 */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '10px 12px',
                              backgroundColor: isExpanded ? '#e8eaf6' : 'transparent',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              border: isExpanded ? '1px solid #667eea' : '1px solid transparent'
                            }}
                            onClick={() => {
                              const newExpanded = new Set(expandedCabinets);
                              if (isExpanded) {
                                newExpanded.delete(cabinet.id);
                              } else {
                                newExpanded.add(cabinet.id);
                              }
                              setExpandedCabinets(newExpanded);
                            }}
                            onMouseEnter={(e) => {
                              if (!isExpanded) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isExpanded) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <ChevronRight
                              style={{
                                width: '16px',
                                height: '16px',
                                marginRight: '8px',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                color: '#667eea'
                              }}
                            />
                            <Book
                              style={{
                                width: '18px',
                                height: '18px',
                                marginRight: '8px',
                                color: cabinetColor
                              }}
                            />
                            <span style={{
                              flex: 1,
                              fontSize: '14px',
                              fontWeight: isExpanded ? '600' : '500',
                              color: '#1a202c'
                            }}>
                              {cabinet.name}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              color: '#9ca3af',
                              marginLeft: '8px'
                            }}>
                              {folderCount}
                            </span>
                          </div>

                          {/* フォルダリスト */}
                          {isExpanded && cabinet.children && cabinet.children.length > 0 && (
                            <div style={{
                              marginLeft: '32px',
                              marginTop: '4px',
                              borderLeft: '2px solid #e5e7eb',
                              paddingLeft: '8px'
                            }}>
                              {cabinet.children.map((folder: FolderNode) => {
                                const isSelected = selectedFolderId === folder.id;
                                // フォルダの色を取得（デフォルトは黄色）
                                const folderColorMap: Record<string, string> = {
                                  blue: '#3b82f6',
                                  green: '#10b981',
                                  red: '#ef4444',
                                  purple: '#8b5cf6',
                                  yellow: '#f59e0b',
                                };
                                const folderColor = folderColorMap[folder.color || 'yellow'] || '#f59e0b';

                                return (
                                  <div
                                    key={folder.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '8px 10px',
                                      backgroundColor: isSelected ? '#e8eaf6' : 'transparent',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      marginBottom: '2px',
                                      border: isSelected ? '1px solid #667eea' : '1px solid transparent',
                                      transition: 'all 0.2s'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFolderId(folder.id);
                                      setCurrentFolder(folder);
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                      }
                                    }}
                                  >
                                    <Folder
                                      style={{
                                        width: '16px',
                                        height: '16px',
                                        marginRight: '8px',
                                        color: folderColor
                                      }}
                                    />
                                    <span style={{
                                      flex: 1,
                                      fontSize: '13px',
                                      fontWeight: isSelected ? '600' : '400',
                                      color: '#374151'
                                    }}>
                                      {folder.name}
                                    </span>
                                    <span style={{
                                      fontSize: '11px',
                                      color: '#9ca3af'
                                    }}>
                                      {folder.children?.length || 0}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* メインコンテンツエリア */}
                <div style={{
                  flex: 1,
                  backgroundColor: 'white',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {selectedFolderId && currentFolder ? (
                    <BookshelfView
                      folders={[currentFolder]}
                      onBookClick={(doc) => {
                        handleBookClick(doc);
                        setViewMode('spread');
                      }}
                      currentCabinetName={currentFolder.name}
                      onBackClick={() => {
                        setSelectedFolderId(null);
                        setCurrentFolder(null);
                      }}
                      breadcrumbs={[
                        { name: 'ライブラリ', id: null },
                        { name: currentFolder.name, id: currentFolder.id }
                      ]}
                      onBreadcrumbClick={() => {}}
                      isSelectionMode={isSelectionMode}
                      selectedDocumentIds={selectedDocumentIds}
                      onToggleDocumentSelection={toggleDocumentSelection}
                      onToggleSelectionMode={toggleSelectionMode}
                      onSelectAll={selectAllDocuments}
                      onDeselectAll={deselectAllDocuments}
                      onBulkDelete={bulkDeleteDocuments}
                    />
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#9ca3af',
                      fontSize: '18px',
                      fontWeight: '500'
                    }}>
                      サイドバーからフォルダを選択してください
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ドキュメントビューワー（モーダル） - 改善版 */}
      {/* 本棚UIを使用していない場合のみ表示 */}
      {selectedDocument && viewMode !== 'spread' && viewMode !== 'bookshelf' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={closeDocument}
          data-testid="modal-overlay"
        >
          {/* ヘッダーエリア */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 200,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)'
          }}>
            {/* ページカウンター */}
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 24px',
              borderRadius: '24px',
              fontSize: '16px',
              fontWeight: '600',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}>
              <span style={{ color: '#fff' }}>{currentPage + 1}</span>
              <span style={{ color: '#888', margin: '0 8px' }}>/</span>
              <span style={{ color: '#aaa' }}>{selectedDocument.pages.length}</span>
            </div>

            {/* 印刷ボタン */}
            <button
              onClick={(e) => { e.stopPropagation(); openPrintModal(); }}
              style={{
                position: 'absolute',
                right: '144px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="印刷"
            >
              <Printer style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>

            {/* ダウンロードボタン */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              style={{
                position: 'absolute',
                right: '84px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="ダウンロード"
            >
              <Download style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>

            {/* 閉じるボタン */}
            <button
              onClick={(e) => { e.stopPropagation(); closeDocument(); }}
              style={{
                position: 'absolute',
                right: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="閉じる (ESC)"
            >
              <X style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>
          </div>

          {/* ナビゲーションボタン（左） */}
          {currentPage > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentPage(currentPage - 1); }}
              style={{
                position: 'absolute',
                left: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: 200,
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="前のページ (←)"
            >
              <ChevronLeft style={{ width: '32px', height: '32px', color: 'white' }} />
            </button>
          )}

          {/* ナビゲーションボタン（右） */}
          {currentPage < selectedDocument.pages.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentPage(currentPage + 1); }}
              style={{
                position: 'absolute',
                right: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: 200,
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="次のページ (→)"
            >
              <ChevronRight style={{ width: '32px', height: '32px', color: 'white' }} />
            </button>
          )}

          {/* コンテンツエリア */}
          <div
            ref={viewerRef}
            style={{
              cursor: dragState.isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              width: '100%',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '100px 40px 160px 40px',
              position: 'relative',
              zIndex: 100
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (dragState.isDragging) handleMouseUp({ preventDefault: () => {} });
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              key={currentPage}
              style={{
                transform: `translateX(${dragState.translateX}px) ${dragState.isDragging ? 'scale(0.95)' : 'scale(1)'}`,
                opacity: dragState.isDragging ? 0.9 : 1,
                zIndex: 60,
                maxWidth: '900px',
                width: '100%',
                transition: dragState.isDragging ? 'transform 0.1s ease-out' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                pointerEvents: 'auto'
              }}
            >
              {selectedDocument.pages[currentPage].type === 'text' ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    borderRadius: '12px',
                    padding: '48px',
                    minHeight: '600px',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#1f2937',
                    lineHeight: '1.75',
                    fontSize: '18px',
                    margin: 0
                  }}>
                    {selectedDocument.pages[currentPage].content}
                  </pre>
                </div>
              ) : selectedDocument.pages[currentPage].type === 'pdf' ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Document
                    file={selectedDocument.pages[currentPage].url}
                    loading={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                        <div style={{ color: '#6b7280' }}>PDFを読み込み中...</div>
                      </div>
                    }
                    error={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                        <div style={{ color: '#ef4444' }}>PDFの読み込みに失敗しました</div>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={selectedDocument.pages[currentPage].pageNumber || 1}
                      scale={pdfScale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                </div>
              ) : selectedDocument.pages[currentPage].type === 'html' ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  dangerouslySetInnerHTML={{ __html: selectedDocument.pages[currentPage].content }}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '48px',
                    minHeight: '600px',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#1f2937',
                    lineHeight: '1.75',
                    fontSize: '14px'
                  }}
                />
              ) : selectedDocument.pages[currentPage].type === 'video' ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <video
                    src={selectedDocument.pages[currentPage].url}
                    controls
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      margin: '0 auto',
                      display: 'block',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              ) : selectedDocument.pages[currentPage].url && (selectedDocument.pages[currentPage].url.startsWith('http') || selectedDocument.pages[currentPage].url.startsWith('data:') || selectedDocument.pages[currentPage].url.startsWith('blob:')) ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={selectedDocument.pages[currentPage].url}
                    alt={`Page ${currentPage + 1}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      margin: '0 auto',
                      display: 'block',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                    draggable="false"
                  />
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '48px',
                    minHeight: '600px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{
                    background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
                    width: '100%',
                    maxWidth: '448px',
                    aspectRatio: '3/4',
                    borderRadius: '8px',
                    border: '2px dashed #d1d5db',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}>
                    <Image
                      style={{ width: '64px', height: '64px', color: '#9ca3af' }}
                      strokeWidth={1.5}
                    />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '18px', fontWeight: 500, color: '#4b5563', margin: 0 }}>No Image</p>
                      <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>画像が読み込めません</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* フッターエリア */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 200,
            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
            pointerEvents: 'none'
          }}>
            {/* 操作ヒント */}
            <div style={{
              color: 'white',
              fontSize: '14px',
              opacity: 0.6,
              textAlign: 'center'
            }}>
              <p className="hidden md:block" style={{ margin: 0 }}>
                ← ドラッグまたは矢印キーでページめくり →
              </p>
              <p className="md:hidden" style={{ margin: 0 }}>
                ← スワイプでページめくり →
              </p>
            </div>

            {/* ページインジケーター */}
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              pointerEvents: 'auto'
            }}>
              {selectedDocument.pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(idx); }}
                  style={{
                    height: idx === currentPage ? '10px' : '8px',
                    width: idx === currentPage ? '32px' : '8px',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    opacity: idx === currentPage ? 1 : 0.4,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: idx === currentPage ? '0 0 12px rgba(255, 255, 255, 0.5)' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = idx === currentPage ? '1' : '0.4'}
                  title={`ページ ${idx + 1}へ移動`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* アップロードモーダル */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">ファイルをアップロード</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* フォルダ選択 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                保存先フォルダ
              </label>
              <select
                value={selectedUploadFolder?.id || ''}
                onChange={(e) => {
                  const allFolders = getAllFolders();
                  const folder = allFolders.find(f => f.id === e.target.value);
                  setSelectedUploadFolder(folder);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {getAllFolders().length === 0 ? (
                  <option value="">フォルダがありません</option>
                ) : (
                  getAllFolders().map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-4">
              {uploadFiles.map((fileData, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <File className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={fileData.name}
                      onChange={(e) => {
                        const newFiles = [...uploadFiles];
                        newFiles[index].name = e.target.value;
                        setUploadFiles(newFiles);
                      }}
                      className="w-full text-sm font-medium bg-transparent border-none outline-none"
                    />
                    <p className="text-xs text-gray-500">{fileData.file.name}</p>
                  </div>
                  <div className={`w-4 h-4 rounded ${getBinderColor(fileData.color)}`} />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  console.log('アップロードボタンがクリックされました');
                  processUploadedFiles();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                アップロード
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新しいフォルダ作成モーダル - 改善版 */}
      {showNewFolderModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowNewFolderModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FolderPlus style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    新しいフォルダを作成
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                フォルダ名
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim() && selectedParentForNewFolder) {
                    createNewFolder();
                  }
                }}
                placeholder="例：重要資料"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  marginBottom: '20px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />

              {/* フォルダの色選択 */}
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                フォルダの色
              </label>
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {folderColorOptions.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setNewFolderColor(colorOption.value)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: colorOption.color,
                      border: newFolderColor === colorOption.value
                        ? `4px solid ${colorOption.color}`
                        : '4px solid transparent',
                      outline: newFolderColor === colorOption.value
                        ? '2px solid #667eea'
                        : '2px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                    }}
                    title={colorOption.name}
                  >
                    {newFolderColor === colorOption.value && (
                      <span style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* 親フォルダ選択 */}
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                作成先
              </label>
              <select
                value={selectedParentForNewFolder?.id || ''}
                onChange={(e) => {
                  const parent = treeData.children.find(c => c.id === e.target.value);
                  setSelectedParentForNewFolder(parent);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                {treeData.children.filter(c => c.type === 'cabinet').map(cabinet => (
                  <option key={cabinet.id} value={cabinet.id}>
                    {cabinet.name}
                  </option>
                ))}
              </select>

              {/* 説明テキスト */}
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #bae6fd'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#0369a1',
                  lineHeight: '1.5'
                }}>
                  💡 <strong>{selectedParentForNewFolder?.name || ''}</strong> の中にフォルダが作成されます
                </p>
              </div>
            </div>

            {/* フッター */}
            <div style={{
              padding: '20px 32px 32px 32px',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowNewFolderModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#64748b',
                  backgroundColor: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                キャンセル
              </button>
              <button
                onClick={createNewFolder}
                disabled={!newFolderName.trim() || !selectedParentForNewFolder}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  background: (newFolderName.trim() && selectedParentForNewFolder)
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#cbd5e1',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: (newFolderName.trim() && selectedParentForNewFolder) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: (newFolderName.trim() && selectedParentForNewFolder) ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (newFolderName.trim() && selectedParentForNewFolder) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = (newFolderName.trim() && selectedParentForNewFolder) ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none';
                }}
              >
                フォルダを作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ファイル追加モーダル - 改善版 */}
      {showFilePickerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowFilePickerModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '520px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Upload style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    ファイルを追加
                  </h3>
                </div>
                <button
                  onClick={() => setShowFilePickerModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 個別ファイル選択 */}
              <button
                onClick={handleIndividualFileUpload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Upload style={{ width: '24px', height: '24px', color: 'white' }} />
                </div>
                <div style={{ textAlign: 'left', color: 'white', flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    個別ファイルを選択
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>
                    PDF、画像、動画、テキストなど
                  </div>
                </div>
              </button>

              {/* フォルダ一括選択 */}
              <button
                onClick={handleFolderUpload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(168, 85, 247, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.3)';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FolderOpen style={{ width: '24px', height: '24px', color: 'white' }} />
                </div>
                <div style={{ textAlign: 'left', color: 'white', flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    フォルダを一括選択
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>
                    フォルダ内の全ファイルを一度に追加
                  </div>
                </div>
              </button>

              <div style={{
                padding: '12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                border: '1px solid #bae6fd',
                marginTop: '8px'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#0369a1',
                  lineHeight: '1.5'
                }}>
                  💡 <strong>複数ファイル選択可能：</strong>Ctrl（Windows）またはCmd（Mac）を押しながらクリックで複数選択できます
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* キャビネット作成モーダル */}
      {showNewCabinetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowNewCabinetModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Book style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    親フォルダを作成
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewCabinetModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                親フォルダ名
              </label>
              <input
                type="text"
                value={newCabinetName}
                onChange={(e) => setNewCabinetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCabinetName.trim()) {
                    createNewCabinet();
                  }
                }}
                placeholder="例：プロジェクト資料、営業資料"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />

              {/* 説明テキスト */}
              <div style={{
                marginTop: '16px',
                padding: '10px 12px',
                backgroundColor: '#faf5ff',
                borderRadius: '8px',
                border: '1px solid #e9d5ff'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#7c3aed',
                  lineHeight: '1.5'
                }}>
                  💡 親フォルダの中にフォルダを作成して、ドキュメントを整理できます
                </p>
              </div>
            </div>

            {/* フッター */}
            <div style={{
              padding: '20px 32px 32px 32px',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowNewCabinetModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#64748b',
                  backgroundColor: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                キャンセル
              </button>
              <button
                onClick={createNewCabinet}
                disabled={!newCabinetName.trim()}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  background: newCabinetName.trim()
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                    : '#cbd5e1',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: newCabinetName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: newCabinetName.trim() ? '0 4px 12px rgba(139, 92, 246, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (newCabinetName.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = newCabinetName.trim() ? '0 4px 12px rgba(139, 92, 246, 0.4)' : 'none';
                }}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteModal && deleteTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowDeleteModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Trash2 style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    {deleteTarget.type === 'folder' ? 'フォルダを削除' : 'ドキュメントを削除'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              <div style={{
                padding: '16px',
                backgroundColor: '#fef2f2',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                marginBottom: '24px'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  color: '#991b1b',
                  lineHeight: '1.6'
                }}>
                  <strong>{deleteTarget.name}</strong> を削除しようとしています。
                  {deleteTarget.type === 'folder' && <span><br />フォルダ内のすべてのドキュメントも削除されます。</span>}
                  <br />この操作は取り消せません。
                </p>
              </div>

              {/* ボタン */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={executeDelete}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                  }}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 印刷オプションモーダル */}
      {showPrintModal && selectedDocument && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowPrintModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '500px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Printer style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    印刷オプション
                  </h3>
                </div>
                <button
                  onClick={() => setShowPrintModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#64748b', fontWeight: '500' }}>
                  印刷範囲を選択してください
                </p>

                {/* 印刷オプション */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    border: `2px solid ${printOption === 'current' ? '#667eea' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: printOption === 'current' ? '#f0f1ff' : 'white'
                  }}>
                    <input
                      type="radio"
                      name="printOption"
                      value="current"
                      checked={printOption === 'current'}
                      onChange={(e) => setPrintOption(e.target.value as any)}
                      style={{ marginRight: '12px', width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                      現在のページのみ ({currentPage + 1}ページ目)
                    </span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    border: `2px solid ${printOption === 'all' ? '#667eea' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: printOption === 'all' ? '#f0f1ff' : 'white'
                  }}>
                    <input
                      type="radio"
                      name="printOption"
                      value="all"
                      checked={printOption === 'all'}
                      onChange={(e) => setPrintOption(e.target.value as any)}
                      style={{ marginRight: '12px', width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                      すべてのページ ({selectedDocument.pages.length}ページ)
                    </span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    border: `2px solid ${printOption === 'spread' ? '#667eea' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: printOption === 'spread' ? '#f0f1ff' : 'white'
                  }}>
                    <input
                      type="radio"
                      name="printOption"
                      value="spread"
                      checked={printOption === 'spread'}
                      onChange={(e) => setPrintOption(e.target.value as any)}
                      style={{ marginRight: '12px', width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                      見開きページ (現在のページ + 次のページ)
                    </span>
                  </label>

                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    border: `2px solid ${printOption === 'range' ? '#667eea' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: printOption === 'range' ? '#f0f1ff' : 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <input
                        type="radio"
                        name="printOption"
                        value="range"
                        checked={printOption === 'range'}
                        onChange={(e) => setPrintOption(e.target.value as any)}
                        style={{ marginRight: '12px', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                        ページ範囲を指定
                      </span>
                    </div>
                    {printOption === 'range' && (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingLeft: '30px' }}>
                        <input
                          type="number"
                          min="1"
                          max={selectedDocument.pages.length}
                          value={printRangeStart}
                          onChange={(e) => setPrintRangeStart(Number(e.target.value))}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                        <span style={{ color: '#64748b' }}>〜</span>
                        <input
                          type="number"
                          min="1"
                          max={selectedDocument.pages.length}
                          value={printRangeEnd}
                          onChange={(e) => setPrintRangeEnd(Number(e.target.value))}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* ボタン */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowPrintModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  キャンセル
                </button>
                <button
                  onClick={executePrint}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  印刷する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 名前変更モーダル */}
      {showRenameModal && renameTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowRenameModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー - オレンジグラデーション（編集アクション） */}
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Edit3 style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    名前を変更
                  </h3>
                </div>
                <button
                  onClick={() => setShowRenameModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              {/* 現在の名前表示 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  現在の名前
                </label>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  {renameTarget.currentName}
                </div>
              </div>

              {/* 新しい名前入力 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  新しい名前
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newName.trim()) {
                      executeRename();
                    }
                  }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                  placeholder="名前を入力してください"
                />
              </div>

              {/* ボタン */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowRenameModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={executeRename}
                  disabled={!newName.trim()}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: newName.trim()
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : '#d1d5db',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: newName.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    color: 'white',
                    boxShadow: newName.trim() ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (newName.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newName.trim()) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                    }
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ドキュメント移動モーダル */}
      {showMoveModal && moveTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowMoveModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー - 紫グラデーション（移動アクション） */}
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MoveRight style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    ドキュメントを移動
                  </h3>
                </div>
                <button
                  onClick={() => setShowMoveModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px' }}>
              {/* ドキュメント名表示 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  移動するドキュメント
                </label>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  {moveTarget.documentName}
                </div>
              </div>

              {/* 移動先フォルダ選択 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  移動先フォルダ
                </label>
                <select
                  value={moveDestinationFolder}
                  onChange={(e) => setMoveDestinationFolder(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                >
                  <option value="">フォルダを選択してください</option>
                  {getAllFolders()
                    .filter(folder => folder.id !== moveTarget.currentFolderId)
                    .map(folder => {
                      // フォルダの階層を取得
                      const getHierarchy = (folderId: string): string => {
                        let hierarchy = '';
                        const findFolder = (nodes: TreeNode[], path: string[] = []): string | null => {
                          for (const node of nodes) {
                            if (node.type === 'folder' && node.id === folderId) {
                              return [...path, node.name].join(' > ');
                            }
                            if (node.children) {
                              const result = findFolder(node.children, [...path, node.name]);
                              if (result) return result;
                            }
                          }
                          return null;
                        };
                        return findFolder(treeData.children) || folder.name;
                      };

                      return (
                        <option key={folder.id} value={folder.id}>
                          {getHierarchy(folder.id)}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* ボタン */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowMoveModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={executeMoveDocument}
                  disabled={!moveDestinationFolder}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: moveDestinationFolder
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                      : '#d1d5db',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: moveDestinationFolder ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    color: 'white',
                    boxShadow: moveDestinationFolder ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (moveDestinationFolder) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (moveDestinationFolder) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                    }
                  }}
                >
                  移動
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 複数ファイル追加モーダル */}
      {showMultiFileModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowMultiFileModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '600px',
            width: '100%',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー - 紫グラデーション（追加アクション） */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              color: 'white',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FilePlus style={{ width: '28px', height: '28px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                    ファイルを追加
                  </h3>
                </div>
                <button
                  onClick={() => setShowMultiFileModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>
              </div>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '32px', flexGrow: 1, overflow: 'auto' }}>
              {/* フォルダ選択 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  📁 追加先フォルダを選択
                </label>
                <select
                  value={selectedTargetFolder}
                  onChange={(e) => setSelectedTargetFolder(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                >
                  {getAllFolders().map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>

              {/* ファイル選択エリア */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  📄 ファイル選択
                </label>
                <div
                  onDragEnter={handleFileDragEnter}
                  onDragLeave={handleFileDragLeave}
                  onDragOver={handleFileDragOver}
                  onDrop={handleFileDrop}
                  style={{
                    border: `2px dashed ${isModalDragging ? '#667eea' : '#d1d5db'}`,
                    borderRadius: '16px',
                    padding: '32px',
                    textAlign: 'center',
                    backgroundColor: isModalDragging ? '#ede9fe' : '#f9fafb',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = '.pdf,.jpg,.jpeg,.png,.heic,.txt,.mp4,.mov,.avi,.webp,.gif,.bmp,.docx,.doc,.xlsx,.xls,.csv,.json,.html,.htm,.md,.markdown';
                    input.onchange = handleFileSelect;
                    input.click();
                  }}
                >
                  <Upload style={{ width: '48px', height: '48px', color: '#667eea', margin: '0 auto 16px' }} />
                  <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '600', color: '#374151' }}>
                    ここにファイルをドロップ
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                    または<span style={{ color: '#667eea', fontWeight: '600' }}>クリックしてファイルを選択</span>
                  </p>
                </div>
              </div>

              {/* 選択済みファイル一覧 */}
              {selectedFiles.length > 0 && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    選択済みファイル ({selectedFiles.length}件)
                  </label>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '8px'
                  }}>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '8px',
                          marginBottom: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                          <File style={{ width: '16px', height: '16px', color: '#667eea', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelectedFile(index);
                          }}
                          style={{
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="削除"
                        >
                          <X style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* フッター - ボタン */}
            <div style={{ padding: '20px 32px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowMultiFileModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#374151'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={executeMultiFileUpload}
                  disabled={selectedFiles.length === 0}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: selectedFiles.length > 0
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#d1d5db',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: selectedFiles.length > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    color: 'white',
                    boxShadow: selectedFiles.length > 0 ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFiles.length > 0) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFiles.length > 0) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                    }
                  }}
                >
                  アップロード ({selectedFiles.length}件)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 非表示のファイル入力 - ドラッグ&ドロップゾーンクリック用 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.heic,.txt,.mp4,.mov,.avi,.webp,.gif,.bmp,.docx,.doc,.xlsx,.xls,.csv,.json,.html,.htm,.md,.markdown,image/*,video/*,application/pdf,text/*,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/html,text/markdown"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </>
  );
};

export default DocumentLibrary;
