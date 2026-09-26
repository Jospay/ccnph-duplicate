import { Text, View } from "react-native";
import "../../global.css";

interface HeaderAuthProps {
  title: string;
  subtitle?: string;
}

export default function HeaderAuth({ title, subtitle }: HeaderAuthProps) {
  return (
    <View className="bg-primary pt-16 pb-24 items-center justify-center">
      <Text className="font-bold text-4xl text-white tracking-tight">
        {title}
      </Text>

      {/* We always render the Text component to keep the height consistent.
         If there's no subtitle, we set opacity-0 so it's invisible but takes up space.
      */}
      <Text
        className={`text-lg text-white pb-4 font-medium ${subtitle ? "opacity-80" : "opacity-0"}`}
      >
        {subtitle || ""}
      </Text>
    </View>
  );
}
