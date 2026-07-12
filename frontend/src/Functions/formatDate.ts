const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatDate = (value: string | Date) => dateFormatter.format(new Date(value));
