import { toolCategories } from "../data/tools"

export function getAllTools() {
  return toolCategories.flatMap(cat =>
    cat.tools.map(tool => ({
      ...tool,
      category: cat.name
    }))
  )
}

export function getToolBySlug(slug: string) {
  return getAllTools().find(tool => tool.slug === slug)
}

export function getToolsByCategory(categoryName: string) {
  return getAllTools().filter(tool => tool.category === categoryName)
}
