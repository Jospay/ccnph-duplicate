import { PaymentBreakdown } from "@/services/checkout";
import React from "react";
import { Text, View } from "react-native";

const fmt = (n: number) =>
  Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type Props = {
  breakdown: PaymentBreakdown;
  totalLabel?: string;
};

type RowProps = {
  label: string;
  value: string;
  valueClass?: string;
};

const Row = ({ label, value, valueClass = "text-slate-700" }: RowProps) => (
  <View className="flex-row justify-between mb-1.5">
    <Text className="text-slate-500 text-sm">{label}</Text>
    <Text className={`text-sm font-semibold ${valueClass}`}>{value}</Text>
  </View>
);

export default function PaymentBreakdownCard({
  breakdown: b,
  totalLabel = "Total Payment",
}: Props) {
  return (
    <View className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
      <Row label="Merchandise Subtotal" value={`₱${fmt(b.subtotal)}`} />

      {b.membership_discount > 0 && (
        <Row
          label="Membership Discount"
          value={`-₱${fmt(b.membership_discount)}`}
          valueClass="text-[#D70127]"
        />
      )}
      {b.shared_capital_discount > 0 && (
        <Row
          label="Shared Capital Discount"
          value={`-₱${fmt(b.shared_capital_discount)}`}
          valueClass="text-[#D70127]"
        />
      )}
      {b.point_discount > 0 && (
        <Row
          label="Points Discount"
          value={`-₱${fmt(b.point_discount)}`}
          valueClass="text-[#D70127]"
        />
      )}

      <Row label="Shipping" value={`₱${fmt(b.shipping_fee)}`} />

      {b.fee > 0 && (
        <>
          <View className="border-t border-slate-200 my-1.5" />
          <Row label="Order Total" value={`₱${fmt(b.order_total)}`} />
          <Row label="Online Processing Fee" value={`₱${fmt(b.fee)}`} />
        </>
      )}

      <View className="border-t border-slate-200 mt-1.5 pt-2 flex-row justify-between">
        <Text className="text-slate-800 font-bold">{totalLabel}</Text>
        <Text className="text-slate-900 font-bold">₱{fmt(b.amount)}</Text>
      </View>
    </View>
  );
}
