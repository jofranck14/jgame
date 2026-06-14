import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export const formatDate    = (d) => dayjs(d).format("DD MMM YYYY");
export const formatDateTime = (d) => dayjs(d).format("DD MMM YYYY à HH:mm");
export const fromNow       = (d) => dayjs(d).fromNow();