import type { IconMap, Site, SocialLink } from "@/types";

export const SITE: Site = {
	title: "wisber.me",
	description: "Own your digital future!",
	href: "https://wisber.me",
	author: "twsl & miscme",
	locale: "en-US",
	featuredPostCount: 3,
	postsPerPage: 5,
};

export const NAV_LINKS: SocialLink[] = [
	{
		href: "/blog",
		label: "blog",
	},
	{
		href: "/authors",
		label: "authors",
	},
	{
		href: "/about",
		label: "about",
	},
];

export const SOCIAL_LINKS: SocialLink[] = [
	{
		href: "https://github.com/wisber",
		label: "GitHub",
	},
	{
		href: "mailto:contact@wisber.me",
		label: "Email",
	},
	{
		href: "/rss.xml",
		label: "RSS",
	},
];

export const ICON_MAP: IconMap = {
	Website: "lucide:globe",
	GitHub: "lucide:github",
	LinkedIn: "lucide:linkedin",
	Twitter: "lucide:twitter",
	BlueSky: "lucide:bluesky",
	Email: "lucide:mail",
	RSS: "lucide:rss",
};
