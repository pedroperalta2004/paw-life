import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Animal = {
  id_animal: string;
  nome: string;
};

type CalendarEvent = {
  id: string;
  date: string;
  time: string | null;
  title: string;
  animalName: string;
  type: string;
  location: string;
  color: string;
};

function getMonthTitle(date: Date) {
  return date.toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });
}

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatShortDate(dateString: string) {
  const date = new Date(dateString);

  return date
    .toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
    })
    .replace(".", "")
    .toUpperCase();
}

function getEventColor(type: string) {
  const lower = type.toLowerCase();

  if (lower.includes("vac")) return "#EC4899";
  if (lower.includes("consult")) return "#3B82F6";
  if (lower.includes("exam")) return "#8B5CF6";
  if (lower.includes("medic")) return "#F59E0B";

  return "#0F9D92";
}

function generateMonthWeeks(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    week.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    week.push(day);

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }

    weeks.push(week);
  }

  return weeks;
}

function formatTime(time: string | null) {
  if (!time) return "Sem hora definida";

  return time.slice(0, 5);
}

export default function CalendarioScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const weeks = useMemo(
    () => generateMonthWeeks(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const today = new Date();
  const selectedDay =
    today.getFullYear() === currentYear && today.getMonth() === currentMonth
      ? today.getDate()
      : null;

  useEffect(() => {
    loadCalendarEvents();
  }, []);

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Utilizador não autenticado.");
      }

      const { data: animalsData, error: animalsError } = await supabase
        .from("animais")
        .select("id_animal, nome")
        .eq("id_utilizador", user.id);

      if (animalsError) throw animalsError;

      const animals = animalsData ?? [];
      const animalIds = animals.map((animal) => animal.id_animal);

      if (animalIds.length === 0) {
        setEvents([]);
        return;
      }

      const { data: healthData, error: healthError } = await supabase
        .from("registos_saude")
        .select("*")
        .in("id_animal", animalIds);

      if (healthError) throw healthError;

      const formattedEvents: CalendarEvent[] = (healthData ?? [])
        .filter((record) => record.proxima_data || record.data_registo)
        .map((record) => {
          const animalName =
            animals.find((animal) => animal.id_animal === record.id_animal)
              ?.nome ?? "Animal";

          const eventDate = record.proxima_data ?? record.data_registo;

          return {
            id: record.id_registo_saude,
            date: eventDate,
            time: record.hora_registo ?? null,
            title: record.titulo,
            animalName,
            type: record.tipo_registo,  
            location: record.local ?? "Sem local definido",
            color: getEventColor(record.tipo_registo),
          };
        });

      setEvents(formattedEvents);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar o calendário."
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendarEvents();
    setRefreshing(false);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const eventsByDay = useMemo(() => {
    const grouped: Record<number, CalendarEvent[]> = {};

    events.forEach((event) => {
      const date = new Date(event.date);

      if (
        date.getFullYear() === currentYear &&
        date.getMonth() === currentMonth
      ) {
        const day = date.getDate();

        if (!grouped[day]) {
          grouped[day] = [];
        }

        grouped[day].push(event);
      }
    });

    return grouped;
  }, [events, currentYear, currentMonth]);

  const upcomingEvents = useMemo(() => {
    const todayKey = formatDateKey(new Date());

    return events
      .filter((event) => event.date >= todayKey)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      .slice(0, 5);
  }, [events]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0F9D92"]}
            tintColor="#0F9D92"
          />
        }
      >
        <Text style={styles.pageTitle}>Calendário</Text>
        <Text style={styles.pageSubtitle}>
          Acompanhe as próximas consultas, vacinações e medicações.
        </Text>

        <Pressable style={styles.scheduleButton}>
          <Feather name="calendar" size={18} color="#FFFFFF" />
          <Text style={styles.scheduleButtonText}>Agendar Consulta</Text>
        </Pressable>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>{getMonthTitle(currentDate)}</Text>

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

            {weeks.map((week, weekIndex) =>
              week.map((day, dayIndex) => {
                const isSelected = day === selectedDay;
                const dayEvents = day ? eventsByDay[day] ?? [] : [];

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
                            isSelected && styles.dayNumberCircleSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              isSelected && styles.dayNumberSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>

                        {dayEvents.length > 0 ? (
                          <View style={styles.dayEventsWrapper}>
                            {dayEvents.slice(0, 2).map((event) => (
                              <View
                                key={event.id}
                                style={[
                                  styles.eventDot,
                                  { backgroundColor: event.color },
                                ]}
                              />
                            ))}

                            {dayEvents.length > 2 ? (
                              <Text style={styles.moreEventsText}>
                                +{dayEvents.length - 2}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>Próximos Eventos</Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0F9D92" />
            </View>
          ) : upcomingEvents.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Sem próximos eventos</Text>
              <Text style={styles.emptyText}>
                Ainda não existem consultas, vacinas ou medicações futuras.
              </Text>
            </View>
          ) : (
            upcomingEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventDateRow}>
                  <View
                    style={[
                      styles.eventDateDot,
                      { backgroundColor: event.color },
                    ]}
                  />
                  <Text style={styles.eventDateText}>
                    {formatShortDate(event.date)}
                  </Text>
                </View>

                <Text style={styles.eventTitle}>
                  {event.title} - {event.animalName}
                </Text>

                <View style={styles.eventInfoRow}>
                  <Ionicons name="time-outline" size={16} color="#64748B" />
                  <Text style={styles.eventInfoText}>{formatTime(event.time)}</Text>
                </View>

                <View style={styles.eventInfoRow}>
                  <Ionicons name="location-outline" size={16} color="#64748B" />
                  <Text style={styles.eventInfoText}>{event.location}</Text>
                </View>
              </View>
            ))
          )}
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
    marginBottom: 20,
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
    textTransform: "capitalize",
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
    height: 78,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    paddingTop: 8,
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

  dayEventsWrapper: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 2,
  },

  moreEventsText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 2,
  },

  eventsSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },

  eventsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },

  loadingBox: {
    paddingVertical: 30,
    alignItems: "center",
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
  },

  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  eventDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  eventDateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  eventDateText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  eventInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  eventInfoText: {
    fontSize: 13,
    color: "#475569",
    marginLeft: 8,
  },
});