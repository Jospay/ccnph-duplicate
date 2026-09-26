import { Text, View } from "react-native";
import "../../global.css";

interface TitleAuthProps {
  title: string;
  description: React.ReactNode;
  containerClass?: string;
}

export default function TitleAuth({
  title,
  description,
  containerClass = "mb-8 mt-1",
}: TitleAuthProps) {
  return (
    <View className={containerClass}>
      <Text className="text-3xl font-bold text-primary text-center">
        {title}
      </Text>
      <View className="mt-2">
        {typeof description === "string" ? (
          <Text className="text-center text-slate-900 text-sm">
            {description}
          </Text>
        ) : (
          description
        )}
      </View>
    </View>
  );
}
