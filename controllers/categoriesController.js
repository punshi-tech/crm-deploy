exports.getCategories = async (req, res) => {
    try {
        const [categories] = await db.query("select * from product_categories")
        res.status(200).json({ categories })
    } catch (err) {
        res.status(500).json({ message: "Inavlid Server Error" })
    }
}