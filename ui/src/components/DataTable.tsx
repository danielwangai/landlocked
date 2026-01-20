import React, { useState, useMemo } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow,
  TableCaption,
} from "./ui/table";
import { ITEMS_PER_PAGE } from "@/utils/constants";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
  actions?: (row: T) => React.ReactNode; // Optional actions renderer
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  caption?: string;
  keyExtractor: (row: T) => string | number;
  itemsPerPage?: number;
  showPagination?: boolean;
  loading?: boolean;
}

export default function DataTable<T>({
  data,
  columns,
  caption,
  keyExtractor,
  itemsPerPage = ITEMS_PER_PAGE,
  showPagination = true,
  loading = false,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  const renderCell = (row: T, column: Column<T>) => {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    const value = row[column.accessor];
    return value !== null && value !== undefined ? String(value) : "";
  };

  return (
    <div className="mt-8">
      <Table>
        {caption && <TableCaption>{caption}</TableCaption>}
        <TableHeader>
          <TableRow className="text-lg">
            {columns.map((column, index) => (
              <TableHead key={index} className={`font-bold ${column.headerClassName}`}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: itemsPerPage }).map((_, rowIndex) => (
              <TableRow
                key={`loading-${rowIndex}`}
                className={rowIndex % 2 === 0 ? "bg-[#e4d5ce]" : "bg-[#e7e1de]"}
              >
                {columns.map((_, colIndex) => (
                  <TableCell
                    key={colIndex}
                    className={`py-3 ${columns[colIndex].className || ""}`}
                  ></TableCell>
                ))}
              </TableRow>
            ))
          ) : paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row, rowIndex) => (
              <TableRow
                key={keyExtractor(row)}
                className={
                  rowIndex % 2 === 0
                    ? "bg-[#e4d5ce] hover:bg-[#e7d9d3] transition-colors"
                    : "bg-[#e7e1de] hover:bg-[#e9e4e1] transition-colors"
                }
              >
                {columns.map((column, colIndex) => (
                  <TableCell
                    key={colIndex}
                    className={`py-3 text-[17px] font-sm ${column.className || ""}`}
                  >
                    {column.actions ? column.actions(row) : renderCell(row, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
        {showPagination && data.length > itemsPerPage && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <span className="px-4">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages || 1, prev + 1))}
                    disabled={currentPage >= (totalPages || 1)}
                    className="px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
