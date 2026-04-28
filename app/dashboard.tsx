import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

export default function DashboardScreen() {
  const activityPoints = [3.8, 3.2, 2.0, 2.9, 1.8, 2.5, 3.9];
  const maxValue = 4;

  const chartWidth = 260;
  const chartHeight = 150;
  const stepX = chartWidth / (activityPoints.length - 1);

  const points = activityPoints.map((value, index) => {
    const x = index * stepX;
    const y = chartHeight - (value / maxValue) * chartHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${chartHeight}` +
    ` L ${points[0].x} ${chartHeight} Z`;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            Bom dia, Ana! <Text style={styles.wave}>👋🏻</Text>
          </Text>
        </View>

        <Text style={styles.subtitle}>
          Aqui está o resumo da saúde dos seus animais hoje.
        </Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryAction}>
            <Ionicons name="add" size={18} color="#0F172A" />
            <Text style={styles.secondaryActionText}>Nova Atividade</Text>
          </Pressable>

          <Pressable style={styles.primaryAction}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Registo Médico</Text>
          </Pressable>
        </View>

        {/* Avisos */}
        <View style={styles.alertCard}>
          <View style={styles.alertLeftBar} />

          <View style={styles.alertContent}>
            <View style={styles.alertHeader}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#B45309"
              />
              <Text style={styles.alertTitle}>Avisos Importantes</Text>
            </View>

            <View style={styles.alertItem}>
              <Text style={styles.alertLabel}>Stock Crítico:</Text>
              <Text style={styles.alertText}>
                A Ração Premier do Max deve acabar em aprox. 7 dias.
              </Text>
            </View>

            <View style={styles.alertItem}>
              <Text style={styles.alertLabel}>Vacina Próxima:</Text>
              <Text style={styles.alertText}>
                A vacina Antirrábica do Max está agendada para amanhã.
              </Text>
            </View>

            <Pressable>
              <Text style={styles.manageAlerts}>Gerir Avisos</Text>
            </Pressable>
          </View>
        </View>

        {/* Próxima Vacina */}
        <View style={styles.infoCard}>
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Próxima Vacina</Text>
            <Text style={styles.infoMainValue}>Max (Antirrábica)</Text>

            <View style={styles.infoSubRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color="#E11D48"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.infoSubText}>Falta 1 dia</Text>
            </View>
          </View>

          <View style={[styles.infoIconBox, styles.iconPink]}>
            <MaterialCommunityIcons
              name="needle"
              size={22}
              color="#E11D48"
            />
          </View>
        </View>

        {/* Atividade semanal */}
        <View style={styles.infoCard}>
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Atividade Semanal</Text>
            <Text style={styles.infoMainValue}>19.2 km</Text>
            <Text style={styles.infoSubMuted}>+2.4km que a última semana</Text>
          </View>

          <View style={[styles.infoIconBox, styles.iconGreen]}>
            <Ionicons name="footsteps-outline" size={22} color="#16A34A" />
          </View>
        </View>

        {/* Peso ideal */}
        <View style={styles.infoCard}>
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Peso Ideal (Luna)</Text>
            <Text style={styles.infoMainValue}>4.2 kg</Text>
            <Text style={styles.infoSubMuted}>Dentro da meta estabelecida</Text>
          </View>

          <View style={[styles.infoIconBox, styles.iconPurple]}>
            <Feather name="activity" size={22} color="#8B5CF6" />
          </View>
        </View>

        {/* Consultas no ano */}
        <View style={styles.infoCard}>
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Consultas no Ano</Text>
            <Text style={styles.infoMainValue}>3</Text>
            <Text style={styles.infoSubMuted}>Próxima: Check-up Anual</Text>
          </View>

          <View style={[styles.infoIconBox, styles.iconOrange]}>
            <Ionicons name="heart-outline" size={22} color="#D97706" />
          </View>
        </View>

        {/* Atividade Física */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Atividade Física (Max)</Text>
              <Text style={styles.chartSubtitle}>
                Distância percorrida nos últimos 7 dias
              </Text>
            </View>

            <View style={styles.chartFilter}>
              <Text style={styles.chartFilterText}>Esta semana</Text>
              <Ionicons name="chevron-down" size={16} color="#94A3B8" />
            </View>
          </View>

          <View style={styles.chartArea}>
            <View style={styles.yAxis}>
              <Text style={styles.axisText}>4</Text>
              <Text style={styles.axisText}>3</Text>
              <Text style={styles.axisText}>2</Text>
              <Text style={styles.axisText}>1</Text>
              <Text style={styles.axisText}>0</Text>
            </View>

            <View style={styles.chartCanvas}>
              <View style={styles.gridLineTop} />
              <View style={styles.gridLineMiddle} />
              <View style={styles.gridLineBottom} />

              <View style={styles.fakeChartWrapper}>
                <View style={styles.fakeAreaBackground} />

                {points.map((point, index) => (
                  <View
                    key={index}
                    style={[
                      styles.chartDot,
                      {
                        left: point.x - 4,
                        top: point.y - 4,
                      },
                    ]}
                  />
                ))}

                {points.slice(0, -1).map((point, index) => {
                  const next = points[index + 1];
                  const dx = next.x - point.x;
                  const dy = next.y - point.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                  return (
                    <View
                      key={`line-${index}`}
                      style={[
                        styles.chartSegment,
                        {
                          width: length,
                          left: point.x,
                          top: point.y,
                          transform: [{ rotate: `${angle}deg` }],
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.xAxis}>
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
                  <Text key={day} style={styles.axisText}>
                    {day}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Últimos registos */}
        <View style={styles.recordsCard}>
          <View style={styles.recordsHeader}>
            <Text style={styles.recordsTitle}>Últimos Registros</Text>
            <Pressable>
              <Text style={styles.viewAll}>Ver todos</Text>
            </Pressable>
          </View>

          <View style={styles.recordItem}>
            <View style={[styles.recordIconCircle, styles.iconPurpleLight]}>
              <Ionicons name="sparkles-outline" size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.recordTitle}>Banho e Tosquia</Text>
              <Text style={styles.recordSubtitle}>Hoje, 10:00 - Luna</Text>
            </View>
          </View>

          <View style={styles.recordItem}>
            <View style={[styles.recordIconCircle, styles.iconGreenLight]}>
              <Ionicons name="footsteps-outline" size={18} color="#10B981" />
            </View>
            <View>
              <Text style={styles.recordTitle}>Passeio no Parque</Text>
              <Text style={styles.recordSubtitle}>Ontem, 18:30 - Max</Text>
            </View>
          </View>

          <View style={styles.recordItem}>
            <View style={[styles.recordIconCircle, styles.iconPinkLight]}>
              <MaterialCommunityIcons
                name="needle"
                size={18}
                color="#E11D48"
              />
            </View>
            <View>
              <Text style={styles.recordTitle}>Desparasitante</Text>
              <Text style={styles.recordSubtitle}>12 Mar, 2024 - Max</Text>
            </View>
          </View>

          <View style={styles.recordItem}>
            <View style={[styles.recordIconCircle, styles.iconBlueLight]}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color="#2563EB"
              />
            </View>
            <View>
              <Text style={styles.recordTitle}>Consulta Dr. Silva</Text>
              <Text style={styles.recordSubtitle}>05 Mar, 2024 - Luna</Text>
            </View>
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

  greetingRow: {
    marginBottom: 8,
  },

  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 32,
  },

  wave: {
    fontSize: 22,
  },

  subtitle: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 20,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },

  secondaryAction: {
    flex: 1,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  secondaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },

  primaryAction: {
    flex: 1,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#DDEDD7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  primaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  alertCard: {
    backgroundColor: "#FFFBEA",
    borderRadius: 20,
    marginBottom: 22,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  alertLeftBar: {
    width: 5,
    backgroundColor: "#F59E0B",
  },

  alertContent: {
    flex: 1,
    padding: 16,
  },

  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },

  alertTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#92400E",
  },

  alertItem: {
    flexDirection: "row",
    marginBottom: 10,
  },

  alertLabel: {
    width: 95,
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },

  alertText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#78350F",
  },

  manageAlerts: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  infoTextBlock: {
    flex: 1,
    paddingRight: 12,
  },

  infoLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 6,
  },

  infoMainValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  infoSubRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  infoSubText: {
    fontSize: 13,
    color: "#E11D48",
    fontWeight: "500",
  },

  infoSubMuted: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
  },

  infoIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  iconPink: {
    backgroundColor: "#FFF1F2",
  },

  iconGreen: {
    backgroundColor: "#EEFBE7",
  },

  iconPurple: {
    backgroundColor: "#F3E8FF",
  },

  iconOrange: {
    backgroundColor: "#FFF7ED",
  },

  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 22,
  },

  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 10,
  },

  chartTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },

  chartSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    maxWidth: 180,
  },

  chartFilter: {
    minWidth: 98,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    alignSelf: "flex-start",
  },

  chartFilterText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },

  chartArea: {
    flexDirection: "row",
  },

  yAxis: {
    width: 24,
    height: 180,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    marginRight: 6,
  },

  axisText: {
    fontSize: 12,
    color: "#94A3B8",
  },

  chartCanvas: {
    flex: 1,
    height: 180,
    justifyContent: "space-between",
  },

  gridLineTop: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderStyle: "dashed",
  },

  gridLineMiddle: {
    position: "absolute",
    top: 65,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderStyle: "dashed",
  },

  gridLineBottom: {
    position: "absolute",
    top: 120,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderStyle: "dashed",
  },

  fakeChartWrapper: {
    height: 150,
    position: "relative",
    marginTop: 6,
  },

  fakeAreaBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 15,
    bottom: 0,
    backgroundColor: "#EAF7DB",
    borderRadius: 16,
    opacity: 0.8,
  },

  chartSegment: {
    position: "absolute",
    height: 3,
    backgroundColor: "#A3B97A",
    transformOrigin: "left center",
  },

  chartDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A3B97A",
  },

  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 2,
  },

  recordsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },

  recordsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  recordsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  viewAll: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },

  recordItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  recordIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  iconPurpleLight: {
    backgroundColor: "#F3E8FF",
  },

  iconGreenLight: {
    backgroundColor: "#ECFDF5",
  },

  iconPinkLight: {
    backgroundColor: "#FFF1F2",
  },

  iconBlueLight: {
    backgroundColor: "#EFF6FF",
  },

  recordTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },

  recordSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
  },
});