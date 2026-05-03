// import React, { useCallback, useState } from "react";
// import {
//   View, Text, FlatList, TouchableOpacity,
//   StyleSheet, ActivityIndicator, RefreshControl,
// } from "react-native";
// import { useFocusEffect, useNavigation } from "@react-navigation/native";
// import { NativeStackNavigationProp } from "@react-navigation/native-stack";
// import { useAuthStore } from "../../store/authStore";
// import { ProfileStackParamList } from "../../navigation/types";
// import { getNotificationsApi, markAllReadApi, markNotifReadApi } from "../../api/tournamentApi";
// import { fromNow } from "../../utils/formatDate";
// import { C } from "../../theme/colors";

// type Nav = NativeStackNavigationProp<ProfileStackParamList>;

// interface Notif {
//   id: number;
//   type: string;
//   title: string;
//   message: string;
//   is_read: number;
//   link?: string;
//   created_at: string;
// }

// // Détermine la route et params à partir du lien backend (ex: /tournaments/5, /users/3)
// function resolveLinkNav(link: string | undefined, nav: Nav) {
//   if (!link) return;
//   // /tournaments/:id
//   const tourMatch = link.match(/\/tournaments\/(\d+)/);
//   if (tourMatch) {
//     // On navigue vers l'onglet Tournaments puis TournamentDetail
//     (nav as any).navigate("Tournaments", {
//       screen: "TournamentDetail",
//       params: { id: Number(tourMatch[1]) },
//     });
//     return;
//   }
//   // /users/:id ou /profile/:id
//   const userMatch = link.match(/\/(?:users|profile)\/(\d+)/);
//   if (userMatch) {
//     nav.navigate("UserProfile", { id: Number(userMatch[1]) });
//     return;
//   }
//   // /admin → profil propre (admin panel pas dispo mobile)
//   if (link.includes("/admin")) {
//     nav.navigate("MyProfile");
//     return;
//   }
//   // /games/:id
//   const gameMatch = link.match(/\/games\/(\d+)/);
//   if (gameMatch) {
//     (nav as any).navigate("Games", {
//       screen: "GameDetail",
//       params: { id: Number(gameMatch[1]) },
//     });
//     return;
//   }
// }

// const TYPE_ICON: Record<string, string> = {
//   tournament: "🏆",
//   payment:    "💳",
//   system:     "📢",
//   match:      "⚔️",
//   result:     "🥇",
// };

// export default function NotificationsScreen() {
//   const navigation = useNavigation<Nav>();
//   const { user } = useAuthStore();
//   const [notifs, setNotifs]       = useState<Notif[]>([]);
//   const [loading, setLoading]     = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   const load = useCallback(async (silent = false) => {
//     if (!silent) setLoading(true);
//     try {
//       const res = await getNotificationsApi();
//       setNotifs(res.data?.notifications || []);
//     } catch {}
//     finally { setLoading(false); setRefreshing(false); }
//   }, []);

//   useFocusEffect(useCallback(() => { load(); }, [load]));

//   const handleTap = async (notif: Notif) => {
//     // Marquer lue
//     if (!notif.is_read) {
//       try { await markNotifReadApi(notif.id); } catch {}
//       setNotifs((prev) =>
//         prev.map((n) => n.id === notif.id ? { ...n, is_read: 1 } : n)
//       );
//     }
//     // Naviguer vers la destination
//     resolveLinkNav(notif.link, navigation);
//   };

//   const handleMarkAllRead = async () => {
//     try {
//       await markAllReadApi();
//       setNotifs((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
//     } catch {}
//   };

//   const unreadCount = notifs.filter((n) => !n.is_read).length;

//   const renderItem = ({ item }: { item: Notif }) => (
//     <TouchableOpacity
//       style={[styles.card, !item.is_read && styles.cardUnread]}
//       onPress={() => handleTap(item)}
//       activeOpacity={0.75}
//     >
//       <View style={styles.iconWrap}>
//         <Text style={styles.icon}>{TYPE_ICON[item.type] || "🔔"}</Text>
//         {!item.is_read && <View style={styles.dot} />}
//       </View>
//       <View style={styles.content}>
//         <Text style={[styles.title, !item.is_read && { color: C.white }]} numberOfLines={1}>
//           {item.title}
//         </Text>
//         <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
//         <Text style={styles.time}>{fromNow(item.created_at)}</Text>
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <View style={styles.root}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
//           <Text style={styles.backText}>←</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>
//           Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
//         </Text>
//         {unreadCount > 0 && (
//           <TouchableOpacity onPress={handleMarkAllRead}>
//             <Text style={styles.readAll}>Tout lire</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {loading ? (
//         <View style={styles.center}><ActivityIndicator size="large" color={C.purple} /></View>
//       ) : (
//         <FlatList
//           data={notifs}
//           keyExtractor={(item) => String(item.id)}
//           renderItem={renderItem}
//           contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={() => { setRefreshing(true); load(); }}
//               tintColor={C.purple}
//             />
//           }
//           ListEmptyComponent={
//             <View style={styles.center}>
//               <Text style={styles.empty}>Aucune notification</Text>
//             </View>
//           }
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root:        { flex: 1, backgroundColor: C.bg },
//   center:      { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
//   header:      { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 52,
//                  borderBottomWidth: 1, borderColor: C.border },
//   back:        { marginRight: 12, padding: 4 },
//   backText:    { color: C.purple, fontSize: 22, fontWeight: "700" },
//   headerTitle: { flex: 1, color: C.white, fontSize: 17, fontWeight: "700" },
//   readAll:     { color: C.purple, fontSize: 13 },
//   card:        { flexDirection: "row", backgroundColor: C.bgCard, borderRadius: 14,
//                  padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
//   cardUnread:  { borderColor: C.purple, backgroundColor: "#1a1040" },
//   iconWrap:    { position: "relative", marginRight: 12, justifyContent: "center" },
//   icon:        { fontSize: 26 },
//   dot:         { position: "absolute", top: 0, right: -2, width: 9, height: 9,
//                  borderRadius: 5, backgroundColor: C.purple, borderWidth: 1.5, borderColor: C.bg },
//   content:     { flex: 1 },
//   title:       { color: C.gray, fontWeight: "700", fontSize: 14, marginBottom: 3 },
//   message:     { color: C.gray, fontSize: 12, lineHeight: 17 },
//   time:        { color: C.grayDark, fontSize: 11, marginTop: 5 },
//   empty:       { color: C.gray, fontSize: 14 },
// });