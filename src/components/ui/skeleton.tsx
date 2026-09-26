import { cn } from "@/lib/utils";
import { View } from "react-native";

function Skeleton({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <View
      className={cn("bg-slate-200 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
