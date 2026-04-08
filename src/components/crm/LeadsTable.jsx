"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLeads } from "@/app/actions/leadActions";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel, //Silnik filtrowania
  useReactTable,
} from "@tanstack/react-table";

export default function LeadsTable() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads(),
  });

  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // ZMIANA 1: Zamykamy kolumny w useMemo. Dzięki temu React ich nie "resetuje" przy każdym kliknięciu!
  const columns = useMemo(() => [
    { accessorKey: "firstName", header: "Imię" },
    { accessorKey: "lastName", header: "Nazwisko" },
    { accessorKey: "email", header: "E-mail" },
    { accessorKey: "phone", header: "Numer telefonu" },
    { 
      accessorKey: "status", 
      header: "Status",
      filterFn: "equalsString" // ZMIANA 2: Wymuszamy dokładne dopasowanie 1:1
    },
  ], []);

  // ZMIANA 3: Zamykamy dane w useMemo dla bezpieczeństwa i wydajności
  const memoizedData = useMemo(() => leads || [], [leads]);

  const table = useReactTable({
    data: memoizedData,
    columns,
    state: { 
      sorting,
      columnFilters, 
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters, 
    onGlobalFilterChange: setGlobalFilter,   
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), 
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 5 },
    },
  });

  if (isLoading) return <p className="p-4 text-gray-500">Ładowanie bazy kontaktów...</p>;

  return (
    <div className="p-6 border rounded-xl shadow-sm bg-white">
      <h2 className="font-bold text-2xl mb-6">Twoje leady</h2>
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        
        <div className="relative w-full md:max-w-md">
          <input
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Wyszukaj leada"
            className="w-full pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 whitespace-nowrap">
            <span>👤+</span> Dodaj leada
          </button>
          
          <select
            value={(table.getColumn("status")?.getFilterValue()) ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              table.getColumn("status")?.setFilterValue(value === "" ? undefined : value);
            }}
            className="px-4 py-2 border rounded-lg bg-white outline-none cursor-pointer hover:bg-gray-50"
          >
            <option value="">Wszystkie leady</option>
            <option value="Nowy">Nowe</option>
            <option value="W kontakcie">W kontakcie</option>
            <option value="Sprzedany">Sprzedane</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b text-gray-500">
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id} 
                    className="p-4 font-medium cursor-pointer select-none hover:text-gray-900"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted()] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, index) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-gray-500">{index + 1}</td>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-gray-500">
                  Brak wyników dla tego filtru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end mt-4 gap-2">
        <button 
          onClick={() => table.previousPage()} 
          disabled={!table.getCanPreviousPage()}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Poprzednia
        </button>
        <span className="text-sm text-gray-600 px-2">
          Strona {table.getState().pagination.pageIndex + 1} z {table.getPageCount() || 1}
        </span>
        <button 
          onClick={() => table.nextPage()} 
          disabled={!table.getCanNextPage()}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Następna
        </button>
      </div>
    </div>
  );
}