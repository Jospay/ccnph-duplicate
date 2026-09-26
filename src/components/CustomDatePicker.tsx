import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface CustomDatePickerProps {
  label: string;
  value: string; // "YYYY-MM-DD"
  onChange: (dateString: string) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  disabled?: boolean;
  labelColor?: string;
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const LOOP_COUNT = 30;
const PRIMARY_COLOR = "#034194";

const formatDisplayDate = (dateString: string) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateString = (dateString: string) => {
  if (!dateString) {
    return new Date(2000, 0, 1);
  }
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const createYearList = (minimumDate?: Date, maximumDate?: Date) => {
  const currentYear = new Date().getFullYear();
  const minYear = minimumDate?.getFullYear() ?? currentYear - 120;
  const maxYear = maximumDate?.getFullYear() ?? currentYear;

  const years: number[] = [];
  for (let year = minYear; year <= maxYear; year++) {
    years.push(year);
  }

  return years;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

interface WheelPickerProps {
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
  loop?: boolean;
  activeColor?: string;
}

const WheelPicker = React.memo(
  ({
    data,
    selectedIndex,
    onSelect,
    width,
    loop = false,
    activeColor = PRIMARY_COLOR,
  }: WheelPickerProps) => {
    // Strongly typing FlatList fixes the TypeScript red line error
    const listRef = useRef<FlatList<string | number>>(null);
    const [activeIndex, setActiveIndex] = useState(selectedIndex);

    useEffect(() => {
      setActiveIndex(selectedIndex);
    }, [selectedIndex]);

    const extendedData = useMemo(() => {
      if (!loop || data.length === 0) return data;
      let result: (string | number)[] = [];
      for (let i = 0; i < LOOP_COUNT; i++) {
        result = result.concat(data);
      }
      return result;
    }, [data, loop]);

    const middleBlockOffset = useMemo(() => {
      if (!loop || data.length === 0) return 0;
      return Math.floor(LOOP_COUNT / 2) * data.length;
    }, [data.length, loop]);

    const initialScrollIndex = useMemo(() => {
      return loop ? middleBlockOffset + selectedIndex : selectedIndex;
    }, [loop, middleBlockOffset, selectedIndex]);

    useEffect(() => {
      if (!listRef.current) return;
      const targetPos = loop
        ? middleBlockOffset + selectedIndex
        : selectedIndex;
      listRef.current.scrollToOffset({
        offset: targetPos * ITEM_HEIGHT,
        animated: false,
      });
    }, [selectedIndex, loop, middleBlockOffset]);

    const processScrollEnd = useCallback(
      (offsetY: number) => {
        const rawIndex = Math.round(offsetY / ITEM_HEIGHT);

        if (loop && data.length > 0) {
          const actualIndex =
            ((rawIndex % data.length) + data.length) % data.length;
          setActiveIndex(actualIndex);
          onSelect(actualIndex);

          const centeredIndex = middleBlockOffset + actualIndex;
          listRef.current?.scrollToOffset({
            offset: centeredIndex * ITEM_HEIGHT,
            animated: false,
          });
        } else {
          const clampedIndex = clamp(rawIndex, 0, data.length - 1);
          setActiveIndex(clampedIndex);
          onSelect(clampedIndex);
        }
      },
      [data.length, loop, middleBlockOffset, onSelect],
    );

    const handleMomentumScrollEnd = useCallback(
      (event: any) => {
        processScrollEnd(event.nativeEvent.contentOffset.y);
      },
      [processScrollEnd],
    );

    const handleScrollEndDrag = useCallback(
      (event: any) => {
        const velocity = event.nativeEvent.velocity?.y ?? 0;
        if (velocity === 0) {
          processScrollEnd(event.nativeEvent.contentOffset.y);
        }
      },
      [processScrollEnd],
    );

    const renderItem = useCallback(
      ({ item, index }: { item: string | number; index: number }) => {
        const realIndex = loop && data.length > 0 ? index % data.length : index;
        const isSelected = realIndex === activeIndex;

        return (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              listRef.current?.scrollToOffset({
                offset: index * ITEM_HEIGHT,
                animated: true,
              });
              setActiveIndex(realIndex);
              onSelect(realIndex);
            }}
            style={{
              height: ITEM_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: isSelected ? 18 : 14,
                fontWeight: isSelected ? "700" : "400",
                color: isSelected ? activeColor : "#94a3b8",
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      },
      [activeIndex, activeColor, data.length, loop, onSelect],
    );

    return (
      <View
        style={{
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
          width: width ?? 110,
          overflow: "hidden",
        }}
      >
        <FlatList<string | number>
          ref={listRef}
          data={extendedData}
          keyExtractor={(_, index) => `${index}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate={0.985}
          bounces={false}
          initialScrollIndex={initialScrollIndex}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          }}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={15}
          removeClippedSubviews={Platform.OS === "android"}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollEndDrag={handleScrollEndDrag}
          renderItem={renderItem}
        />

        {/* Selected row overlay */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
            left: 0,
            right: 0,
            height: ITEM_HEIGHT,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: "#CBD5E1",
          }}
        />
      </View>
    );
  },
);

WheelPicker.displayName = "WheelPicker";

export const CustomDatePicker = ({
  label,
  value,
  onChange,
  placeholder = "Select date",
  maximumDate,
  minimumDate,
  disabled = false,
  labelColor,
}: CustomDatePickerProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(parseDateString(value));

  const activeColor = labelColor ?? PRIMARY_COLOR;

  const years = useMemo(
    () => createYearList(minimumDate, maximumDate),
    [minimumDate, maximumDate],
  );

  const [selectedMonth, setSelectedMonth] = useState(tempDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(tempDate.getDate() - 1);
  const [selectedYear, setSelectedYear] = useState(
    Math.max(0, years.indexOf(tempDate.getFullYear())),
  );

  const openPicker = () => {
    if (disabled) return;
    const parsed = parseDateString(value);
    setTempDate(parsed);

    const yearIdx = Math.max(0, years.indexOf(parsed.getFullYear()));
    setSelectedMonth(parsed.getMonth());
    setSelectedYear(yearIdx);

    const daysInMonth = getDaysInMonth(parsed.getFullYear(), parsed.getMonth());
    setSelectedDay(clamp(parsed.getDate() - 1, 0, daysInMonth - 1));

    setModalVisible(true);
  };

  const handleConfirm = () => {
    const currentYear = years[selectedYear] ?? tempDate.getFullYear();
    const daysInMonth = getDaysInMonth(currentYear, selectedMonth);
    const validDay = clamp(selectedDay + 1, 1, daysInMonth);

    let finalDate = new Date(currentYear, selectedMonth, validDay);

    if (minimumDate && finalDate < minimumDate) finalDate = minimumDate;
    if (maximumDate && finalDate > maximumDate) finalDate = maximumDate;

    onChange(toDateString(finalDate));
    setModalVisible(false);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleMonthChange = useCallback((index: number) => {
    setSelectedMonth(index);
  }, []);

  const handleDayChange = useCallback((index: number) => {
    setSelectedDay(index);
  }, []);

  const handleYearChange = useCallback(
    (index: number) => {
      setSelectedYear(index);
      const year = years[index];
      const daysInMonth = getDaysInMonth(year, selectedMonth);
      setSelectedDay((prev) => clamp(prev, 0, daysInMonth - 1));
    },
    [years, selectedMonth],
  );

  const days = useMemo(() => {
    const year = years[selectedYear] ?? tempDate.getFullYear();
    const totalDays = getDaysInMonth(year, selectedMonth);
    return Array.from({ length: totalDays }, (_, index) => index + 1);
  }, [years, selectedYear, selectedMonth, tempDate]);

  return (
    <View className="mb-5">
      <Text
        className="mb-2 ml-2 font-medium text-xs uppercase"
        style={labelColor ? { color: labelColor } : { color: PRIMARY_COLOR }}
      >
        {label}
      </Text>

      {/* Trigger Input Button */}
      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.7}
        disabled={disabled}
        className={`flex-row items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 ${
          disabled ? "bg-slate-50 opacity-60" : ""
        }`}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={`flex-1 mr-2 text-base font-normal ${
            value ? "text-slate-800" : "text-slate-400"
          }`}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>

        <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
      </TouchableOpacity>

      {/* Android Modal */}
      {Platform.OS === "android" && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={handleCancel}
        >
          <TouchableWithoutFeedback onPress={handleCancel}>
            <View className="flex-1 bg-black/50 justify-center items-center px-5">
              <TouchableWithoutFeedback>
                <View className="bg-white w-full max-w-[500px] rounded-3xl p-5 shadow-xl">
                  {/* Header */}
                  <View className="flex-row justify-between items-center pb-3 mb-2 border-b border-slate-100">
                    <Text className="text-slate-800 font-bold text-lg">
                      {label}
                    </Text>

                    <TouchableOpacity onPress={handleCancel} className="p-1">
                      <Ionicons name="close" size={22} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* Scrolling Wheels */}
                  <View
                    className="flex-row justify-center items-center"
                    style={{ backgroundColor: "#FFFFFF" }}
                  >
                    <WheelPicker
                      data={MONTHS}
                      selectedIndex={selectedMonth}
                      onSelect={handleMonthChange}
                      width={125}
                      loop={true}
                      activeColor={activeColor}
                    />

                    <WheelPicker
                      data={days}
                      selectedIndex={selectedDay}
                      onSelect={handleDayChange}
                      width={75}
                      loop={true}
                      activeColor={activeColor}
                    />

                    <WheelPicker
                      data={years}
                      selectedIndex={selectedYear}
                      onSelect={handleYearChange}
                      width={95}
                      loop={false}
                      activeColor={activeColor}
                    />
                  </View>

                  {/* Done Button */}
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className="w-full bg-primary py-3.5 rounded-2xl items-center mt-4"
                  >
                    <Text className="text-white font-bold text-base">Done</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* iOS Modal */}
      {Platform.OS === "ios" && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={handleCancel}
        >
          <TouchableWithoutFeedback onPress={handleCancel}>
            <View className="flex-1 bg-black/50 justify-center items-center px-5">
              <TouchableWithoutFeedback>
                <View className="bg-white w-full max-w-[500px] rounded-3xl p-5 shadow-xl">
                  <View className="flex-row justify-between items-center pb-3 mb-2 border-b border-slate-100">
                    <Text className="text-slate-800 font-bold text-lg">
                      {label}
                    </Text>

                    <TouchableOpacity onPress={handleCancel} className="p-1">
                      <Ionicons name="close" size={22} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    maximumDate={maximumDate}
                    minimumDate={minimumDate}
                    onChange={(_, selectedDate) => {
                      if (selectedDate) setTempDate(selectedDate);
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      onChange(toDateString(tempDate));
                      setModalVisible(false);
                    }}
                    className="w-full bg-primary py-3.5 rounded-2xl items-center mt-4"
                  >
                    <Text className="text-white font-bold text-base">Done</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};
