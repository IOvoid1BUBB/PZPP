"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLeads } from "../actions/leadActions";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

export default function LeadsTable() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads(),
  });

  const [sorting, setSorting] = useState([]);

  // Definiujemy kolumny
  const columns = [
    { accessorKey: "firstName", header: "Imię" },
    { accessorKey: "lastName", header: "Nazwisko" },
    { accessorKey: "email", header: "E-mail" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "score", header: "Scoring" },
  ];

  const table = useReactTable({
    data: leads || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // Moduł sortowania
    getPaginationRowModel: getPaginationRowModel(), // Moduł paginacji
    initialState: {
      pagination: { pageSize: 5 }, // Pokazuj 5 leadów na stronie
    },
  });

  if (isLoading) return <p>Ładowanie bazy kontaktów...</p>;

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h2 className="font-bold text-xl mb-4">Zdobyte Kontakty (CRM)</h2>
      
      <table className="min-w-full text-left border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="bg-gray-100 border-b">
              {headerGroup.headers.map(header => (
                <th 
                  key={header.id} 
                  className="p-2 cursor-pointer select-none hover:bg-gray-200"
                  onClick={header.column.getToggleSortingHandler()} // Kliknięcie sortuje kolumnę!
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {/* Ikonki sortowania */}
                  {{ asc: ' 🔼', desc: ' 🔽' }[header.column.getIsSorted()] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-b hover:bg-gray-50">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="p-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Kontrolki Paginacji (Stronicowania) */}
      <div className="flex items-center justify-between mt-4">
        <div>
          <button 
            onClick={() => table.previousPage()} 
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border rounded disabled:opacity-50 mr-2"
          >
            Poprzednia
          </button>
          <button 
            onClick={() => table.nextPage()} 
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Następna
          </button>
        </div>
        <span className="text-sm text-gray-600">
          Strona {table.getState().pagination.pageIndex + 1} z {table.getPageCount() || 1}
        </span>
      </div>
    </div>
  );
}