import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export default function Card({ children, style, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: "#1e293b",
          borderRadius: 12,
          padding: 16,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
