// Site content, carried over from the previous portfolio (../old/index.html).

export const profile = {
  name: "Johan Nithish G K",
  shortName: "Johan Nithish",
  roles: ["Software Developer", "Web Developer", "Web Designer", "Content Writer"],
  tagline:
    "A passionate Full-Stack Developer and Software Engineer dedicated to building high-performance, user-friendly web applications and software solutions.",
  email: "johangkjohangk287@gmail.com",
  phone: "+91 81100 44743",
  phoneHref: "tel:+918110044743",
  location: "Coimbatore, Tamil Nadu",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/johan-nithish-g-k/", icon: "linkedin" },
    { label: "Instagram", href: "https://www.instagram.com/johan_s_burg/", icon: "instagram" },
  ] as const,
};

export const stats = [
  { value: "25+", label: "Real-world projects" },
  { value: "2 yrs", label: "Practical experience" },
];

export const about = {
  title: "Turning ideas into working software",
  body:
    "Hey there! I'm Johan Nithish, a full-stack developer and software engineer with 2 years of hands-on experience building digital solutions. Over the past two years I've delivered 25+ projects, from dynamic websites to scalable software applications.",
  points: [
    {
      title: "Work & Approach",
      body: "Every project I take on reflects my dedication to detail, creativity, and problem-solving.",
    },
    {
      title: "Ideas into Reality",
      body: "I bring ideas to life by transforming concepts into fully functional websites.",
    },
  ],
};

export const services = [
  {
    title: "Creative Works & Projects",
    body: "Every project I create is a blend of innovation, design, and functionality. From dynamic web applications to powerful software solutions, my work reflects my passion for problem-solving and creative development.",
  },
  {
    title: "My Journey of Innovation",
    body: "A collection of real-world projects where I've applied the latest technology to bring ideas to life, each showcasing full-stack development and software engineering.",
  },
  {
    title: "A Showcase of My Projects",
    body: "Where technology meets creativity. From responsive websites to scalable applications, these projects highlight my skills and commitment to building seamless experiences.",
  },
];

export const projects = [
  { title: "Stark Motors", kind: "CRM & Website", href: "https://starkmotors.com/", image: "/projects/project-4.jpg" },
  { title: "Business Championz Community", kind: "Social Community Website", href: "https://bcc365.in/", image: "/projects/project-5.jpg" },
  { title: "Radoncconnect", kind: "Portfolio Website", href: "https://radoncconnect.com/", image: "/projects/project-1.jpg" },
  { title: "Senior Home Brindavan", kind: "Business Website", href: "https://seniorhomebrindavan.com/", image: "/projects/project-3.jpg" },
];

export const education = [
  { title: "MCA", period: "2023 – 2025", body: "Worked on real-world projects and explored web development, databases, and algorithms." },
  { title: "B.Sc Computer Science", period: "2020 – 2023", body: "Built a strong foundation in software development, system architecture, and advanced programming." },
];

export const experience = [
  { title: "Mist Solutions", period: "2 years · Intern", body: "Hands-on experience in full-stack development, software engineering, and problem-solving." },
];

export const nav = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Resume", href: "#resume" },
  { label: "Contact", href: "#contact" },
];

