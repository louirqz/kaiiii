'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Calendar,
  Download,
  RefreshCw,
  CreditCard,
  QrCode,
  Banknote,
  Award,
  ArrowUpRight,
  Percent,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ReportData {
  today: {
    sales: number;
    orders: number;
    itemsSold: number;
    averageOrder: number;
  };
  period: {
    revenue: number;
    ordersCount: number;
    itemsSold: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
  };
  chartData: { date: string; displayDate: string; revenue: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number; cost: number }[];
  paymentBreakdown: {
    CASH: { count: number; amount: number };
    QR_PROMPTPAY: { count: number; amount: number };
    OTHER: { count: number; amount: number };
  };
}

function formatCurrency(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/reports?range=${range}`;
      if (range === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('ไม่สามารถโหลดข้อมูลรายงานได้');
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [range, startDate, endDate, toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!data) return;

    let csv = '\uFEFF'; // UTF-8 BOM for Excel Thai language support
    csv += 'รายงานการขายร้าน nnichna\n';
    csv += `ช่วงเวลา,${range}\n\n`;

    csv += '--- สรุปภาพรวมช่วงเวลา ---\n';
    csv += `ยอดขายรวม (บาท),${data.period.revenue}\n`;
    csv += `จำนวนออเดอร์ทั้งหมด,${data.period.ordersCount}\n`;
    csv += `จำนวนชิ้นสินค้าที่ขายได้,${data.period.itemsSold}\n`;
    csv += `ต้นทุนรวม (บาท),${data.period.totalCost}\n`;
    csv += `กำไรขั้นต้น (บาท),${data.period.grossProfit}\n`;
    csv += `อัตรากำไร (%),${data.period.profitMargin.toFixed(2)}%\n\n`;

    csv += '--- ยอดขายรายวัน ---\n';
    csv += 'วันที่,ยอดขาย (บาท),จำนวนออเดอร์\n';
    data.chartData.forEach((row) => {
      csv += `"${row.date}",${row.revenue},${row.orders}\n`;
    });
    csv += '\n';

    csv += '--- 10 อันดับสินค้าขายดี ---\n';
    csv += 'อันดับ,ชื่อสินค้า,จำนวนที่ขายได้ (ชิ้น),ยอดขายรวม (บาท),ต้นทุนรวม (บาท),กำไร (บาท)\n';
    data.topProducts.forEach((p, idx) => {
      const profit = p.revenue - p.cost;
      csv += `${idx + 1},"${p.name.replace(/"/g, '""')}",${p.quantity},${p.revenue},${p.cost},${profit}\n`;
    });
    csv += '\n';

    csv += '--- สรุปช่องทางชำระเงิน ---\n';
    csv += 'ช่องทาง,จำนวนครั้ง,ยอดเงินรวม (บาท)\n';
    csv += `เงินสด (CASH),${data.paymentBreakdown.CASH.count},${data.paymentBreakdown.CASH.amount}\n`;
    csv += `พร้อมเพย์ QR (PromptPay),${data.paymentBreakdown.QR_PROMPTPAY.count},${data.paymentBreakdown.QR_PROMPTPAY.amount}\n`;
    csv += `อื่นๆ,${data.paymentBreakdown.OTHER.count},${data.paymentBreakdown.OTHER.amount}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nnichna-sales-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('ดาวน์โหลดรายงาน CSV เรียบร้อยแล้ว');
  };

  const maxRevenue = data?.chartData?.length ? Math.max(...data.chartData.map((d) => d.revenue), 1) : 1;

  const totalPaymentAmount = data
    ? data.paymentBreakdown.CASH.amount +
      data.paymentBreakdown.QR_PROMPTPAY.amount +
      data.paymentBreakdown.OTHER.amount
    : 0;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>รายงานและการวิเคราะห์การขาย</h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            วิเคราะห์ยอดขาย กำไร สินค้าขายดี และช่องทางการชำระเงินของร้าน nnichna
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => fetchReports()}
            disabled={isLoading}
            className="btn-secondary"
            style={{
              padding: '9px 14px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            รีเฟรช
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!data || isLoading}
            style={{
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            <Download size={16} />
            ส่งออก CSV (Excel)
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid #334155',
          borderRadius: 14,
          padding: '12px 18px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Calendar size={16} style={{ color: '#ff1a6c', marginRight: 4 }} />
          {[
            { id: 'today', label: 'วันนี้' },
            { id: '7days', label: '7 วันล่าสุด' },
            { id: '30days', label: '30 วันล่าสุด' },
            { id: 'thisMonth', label: 'เดือนนี้' },
            { id: 'lastMonth', label: 'เดือนที่แล้ว' },
            { id: 'custom', label: 'กำหนดเอง' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setRange(btn.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: range === btn.id ? 700 : 500,
                border: range === btn.id ? '1px solid #ff1a6c' : '1px solid transparent',
                background: range === btn.id ? 'rgba(230, 0, 82, 0.2)' : 'rgba(51, 65, 85, 0.4)',
                color: range === btn.id ? '#ff4d88' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#f8fafc',
                padding: '6px 10px',
                fontSize: '0.8rem',
              }}
            />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#f8fafc',
                padding: '6px 10px',
                fontSize: '0.8rem',
              }}
            />
            <button
              onClick={fetchReports}
              style={{
                background: '#ff1a6c',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ค้นหา
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Revenue */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.9))',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 80,
              height: 80,
              background: 'radial-gradient(circle, rgba(230,0,82,0.15) 0%, transparent 70%)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>ยอดขายสุทธิ</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(230,0,82,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={18} style={{ color: '#ff1a6c' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
            {data ? formatCurrency(data.period.revenue) : '฿0'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#34d399' }}>
            <ArrowUpRight size={14} />
            <span>วันนี้: {data ? formatCurrency(data.today.sales) : '฿0'}</span>
          </div>
        </div>

        {/* Orders */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.9))',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>จำนวนออเดอร์</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(99,102,241,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={18} style={{ color: '#818cf8' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
            {data ? data.period.ordersCount.toLocaleString() : '0'}{' '}
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>ออเดอร์</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            วันนี้: {data ? data.today.orders : 0} ออเดอร์
          </div>
        </div>

        {/* Items Sold */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.9))',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>สินค้าที่ขายได้</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(16,185,129,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={18} style={{ color: '#34d399' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
            {data ? data.period.itemsSold.toLocaleString() : '0'}{' '}
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>ชิ้น</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            วันนี้: {data ? data.today.itemsSold : 0} ชิ้น
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.9))',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>กำไรขั้นต้น</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(245,158,11,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Percent size={18} style={{ color: '#fbbf24' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginBottom: 6 }}>
            {data ? formatCurrency(data.period.grossProfit) : '฿0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            อัตรากำไร:{' '}
            <span style={{ color: '#34d399', fontWeight: 600 }}>
              {data ? data.period.profitMargin.toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Sales Trend Bar Chart */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>กราฟแสดงยอดขายตามวัน</h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                แนวโน้มยอดขายและจำนวนบิลในช่วงเวลาที่เลือก
              </p>
            </div>
            <TrendingUp size={20} style={{ color: '#ff1a6c' }} />
          </div>

          {/* Bar Chart Container */}
          <div style={{ flex: 1, minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {data?.chartData && data.chartData.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: data.chartData.length > 14 ? 3 : 8,
                  height: 180,
                  paddingBottom: 8,
                  borderBottom: '1px solid #334155',
                }}
              >
                {data.chartData.map((d) => {
                  const barHeight = Math.max((d.revenue / maxRevenue) * 150, 4);
                  return (
                    <div
                      key={d.date}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      title={`${d.displayDate}\nยอดขาย: ${formatCurrency(d.revenue)}\nบิล: ${d.orders} รายการ`}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: barHeight,
                          background:
                            d.revenue > 0
                              ? 'linear-gradient(180deg, #ff1a6c 0%, rgba(230,0,82,0.4) 100%)'
                              : 'rgba(51, 65, 85, 0.4)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease, background 0.2s',
                        }}
                        className="hover:opacity-80"
                      />
                      <span
                        style={{
                          fontSize: data.chartData.length > 10 ? '0.62rem' : '0.7rem',
                          color: '#64748b',
                          marginTop: 6,
                          whiteSpace: 'nowrap',
                          transform: data.chartData.length > 10 ? 'rotate(-30deg)' : 'none',
                          transformOrigin: 'top left',
                        }}
                      >
                        {d.displayDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>ไม่มีข้อมูลการขายในช่วงนี้</div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>สัดส่วนการชำระเงิน</h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                ยอดรวมทั้งหมด {formatCurrency(totalPaymentAmount)}
              </p>
            </div>
            <CreditCard size={20} style={{ color: '#818cf8' }} />
          </div>

          {data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* PromptPay QR */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.85rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <QrCode size={16} style={{ color: '#818cf8' }} />
                    พร้อมเพย์ QR (PromptPay)
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>
                    {formatCurrency(data.paymentBreakdown.QR_PROMPTPAY.amount)}
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#1e293b', borderRadius: 99 }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 99,
                      background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                      width: `${
                        totalPaymentAmount > 0
                          ? (data.paymentBreakdown.QR_PROMPTPAY.amount / totalPaymentAmount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  <span>{data.paymentBreakdown.QR_PROMPTPAY.count} รายการ</span>
                  <span>
                    {totalPaymentAmount > 0
                      ? ((data.paymentBreakdown.QR_PROMPTPAY.amount / totalPaymentAmount) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </div>

              {/* Cash */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.85rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Banknote size={16} style={{ color: '#34d399' }} />
                    เงินสด (Cash)
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                    {formatCurrency(data.paymentBreakdown.CASH.amount)}
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#1e293b', borderRadius: 99 }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 99,
                      background: 'linear-gradient(90deg, #059669, #34d399)',
                      width: `${
                        totalPaymentAmount > 0
                          ? (data.paymentBreakdown.CASH.amount / totalPaymentAmount) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  <span>{data.paymentBreakdown.CASH.count} รายการ</span>
                  <span>
                    {totalPaymentAmount > 0
                      ? ((data.paymentBreakdown.CASH.amount / totalPaymentAmount) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </div>

              {/* Other */}
              {data.paymentBreakdown.OTHER.count > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>อื่นๆ</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
                      {formatCurrency(data.paymentBreakdown.OTHER.amount)}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#1e293b', borderRadius: 99 }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 99,
                        background: '#64748b',
                        width: `${
                          totalPaymentAmount > 0
                            ? (data.paymentBreakdown.OTHER.amount / totalPaymentAmount) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Top 10 Best Sellers Table */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: '24px',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={22} style={{ color: '#fbbf24' }} />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                10 อันดับเมนูขายดีที่สุด
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                จัดอันดับตามจำนวนชิ้นที่จำหน่ายได้ในช่วงเวลาที่เลือก
              </p>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#64748b', fontSize: '0.75rem' }}>
                <th style={{ padding: '12px 14px' }}>อันดับ</th>
                <th style={{ padding: '12px 14px' }}>ชื่อเมนู</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>จำนวนที่ขาย (ชิ้น)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>ยอดขายรวม</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>ต้นทุนรวม</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>กำไรขั้นต้น</th>
              </tr>
            </thead>
            <tbody>
              {data?.topProducts && data.topProducts.length > 0 ? (
                data.topProducts.map((p, index) => {
                  const profit = p.revenue - p.cost;
                  const rankColors = ['#f59e0b', '#94a3b8', '#b45309'];
                  return (
                    <tr
                      key={p.name}
                      style={{
                        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                        transition: 'background 0.15s',
                      }}
                      className="hover:bg-slate-800/40"
                    >
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: index < 3 ? rankColors[index] : 'rgba(51,65,85,0.6)',
                            color: index < 3 ? '#0f172a' : '#94a3b8',
                          }}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td style={{ padding: '14px', fontWeight: 600, color: '#f1f5f9' }}>{p.name}</td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                        {p.quantity.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#ff1a6c' }}>
                        {formatCurrency(p.revenue)}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', color: '#94a3b8' }}>
                        {formatCurrency(p.cost)}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                        {formatCurrency(profit)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    ไม่มีข้อมูลสินค้าขายดีในช่วงนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
