import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const months = [
  {
    title: "Fevereiro 2026",
    weeks: [
      [1, 2, 3, 4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19, 20, 21],
      [22, 23, 24, 25, 26, 27, 28],
      [null, null, null, null, null, null, null],
    ],
    selectedDay: null,
    events: {},
  },
  {
    title: "Março 2026",
    weeks: [
      [1, 2, 3, 4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19, 20, 21],
      [22, 23, 24, 25, 26, 27, 28],
      [29, 30, 31, null, null, null, null],
    ],
    selectedDay: 17,
    events: {
      18: { label: "1.", color: "#EC4899" },
      21: { label: "1.", color: "#60A5FA" },
    },
  },
  {
    title: "Abril 2026",
    weeks: [
      [null, null, null, 1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24, 25],
      [26, 27, 28, 29, 30, null, null],
    ],
    selectedDay: null,
    events: {},
  },
];

export default function CalendarioScreen() {
  const [monthIndex, setMonthIndex] = useState(1);

  const currentMonth = months[monthIndex];

  const goToPreviousMonth = () => {
    if (monthIndex > 0) {
      setMonthIndex(monthIndex - 1);
    }
  };

  const goToNextMonth = () => {
    if (monthIndex < months.length - 1) {
      setMonthIndex(monthIndex + 1);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Calendário</Text>
        <Text style={styles.pageSubtitle}>
          Acompanhe as próximas consultas e vacinações.
        </Text>

        <Pressable style={styles.scheduleButton}>
          <Feather name="calendar" size={18} color="#FFFFFF" />
          <Text style={styles.scheduleButtonText}>Agendar Consulta</Text>
        </Pressable>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>{currentMonth.title}</Text>

            <View style={styles.monthNavigation}>
              <Pressable onPress={goToPreviousMonth} style={styles.arrowButton}>
                <Ionicons name="chevron-back" size={20} color="#64748B" />
              </Pressable>

              <Pressable onPress={goToNextMonth} style={styles.arrowButton}>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <View style={styles.calendarGrid}>
            {weekDays.map((day) => (
              <View key={day} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}

            {currentMonth.weeks.map((week, weekIndex) =>
              week.map((day, dayIndex) => {
                const isSelected = day === currentMonth.selectedDay;
                const event =
                  day !== null ? currentMonth.events[day as keyof typeof currentMonth.events] : null;

                return (
                  <View
                    key={"w-" + weekIndex + "-d-" + dayIndex}
                    style={styles.dayCell}
                  >
                    {day !== null ? (
                      <>
                        <View
                          style={[
                            styles.dayNumberCircle,
                            isSelected ? styles.dayNumberCircleSelected : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              isSelected ? styles.dayNumberSelected : null,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>

                        {event ? (
                          <Text style={[styles.eventLabel, { color: event.color }]}>
                            {event.label}
                          </Text>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  container: {
    padding: 18,
    paddingBottom: 40,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  pageSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#334155",
    marginBottom: 18,
    maxWidth: 280,
  },

  scheduleButton: {
    height: 46,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#0F9D92",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  scheduleButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 10,
  },

  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },

  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  calendarTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
  },

  arrowButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  calendarGrid: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },

  weekDayCell: {
    width: "14.2857%",
    height: 38,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  weekDayText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },

  dayCell: {
    width: "14.2857%",
    height: 98,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    paddingTop: 10,
  },

  dayNumberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  dayNumberCircleSelected: {
    backgroundColor: "#14B8A6",
  },

  dayNumber: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },

  dayNumberSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  eventLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
  },
});