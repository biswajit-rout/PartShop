import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.brand import Brand
from app.models.mechanic import Mechanic, MechanicBrandCommission


async def seed():
    async with AsyncSessionLocal() as db:
        # 1. Seed Cashier1 user if missing
        res = await db.execute(select(User).where(User.username == "cashier1"))
        if not res.scalar_one_or_none():
            cashier = User(
                username="cashier1",
                email="cashier1@partshop.com",
                full_name="Ravi Kumar (Cashier)",
                password_hash=hash_password("Password123!"),
                role=UserRole.COUNTER_STAFF,
                is_active=True,
            )
            db.add(cashier)
            print("Seeded user: cashier1")

        # 2. Seed Default Brands
        default_brands = [
            ("Hero", "HERO", "Hero MotoCorp OEM & Genuine Spares"),
            ("Bajaj", "BAJ", "Bajaj Auto Genuine Spares"),
            ("Honda", "HON", "Honda Motorcycle & Scooter Genuine Parts"),
            ("TVS", "TVS", "TVS Motor Genuine Spare Parts"),
            ("Yamaha", "YAM", "Yamaha Motor Genuine Components"),
            ("Royal Enfield", "RE", "Royal Enfield Genuine Motorcycle Spares"),
            ("Bosch", "BOSCH", "Bosch Automotive Electrical & Brake Systems"),
            ("Endurance", "ENDUR", "Endurance Shock Absorbers & Brakes"),
            ("Castrol", "CAST", "Castrol High Performance Engine Lubricants"),
            ("Minda", "MINDA", "Uno Minda Electricals, Horns & Locks"),
        ]

        brand_map = {}
        for name, code, desc in default_brands:
            res = await db.execute(select(Brand).where(Brand.name == name))
            b = res.scalar_one_or_none()
            if not b:
                b = Brand(name=name, code=code, description=desc)
                db.add(b)
                await db.flush()
                print(f"Seeded brand: {name}")
            brand_map[name] = b

        # 3. Seed Default Mechanics with Brand Commission Matrix
        mechanics_data = [
            {
                "name": "Ramesh Sharma",
                "phone": "+91 98765 43210",
                "garage_name": "Ramesh Auto Care",
                "address": "Shop 4, Main Market, Station Road",
                "default_pct": Decimal("5.00"),
                "commissions": [
                    ("Hero", Decimal("8.00")),
                    ("Bajaj", Decimal("10.00")),
                    ("Endurance", Decimal("12.00")),
                ],
            },
            {
                "name": "Suresh Patil",
                "phone": "+91 98765 43211",
                "garage_name": "Suresh Two Wheeler Works",
                "address": "Plot 12, Industrial Area, Bypass",
                "default_pct": Decimal("6.00"),
                "commissions": [
                    ("Honda", Decimal("9.00")),
                    ("Bosch", Decimal("11.00")),
                    ("Castrol", Decimal("10.00")),
                ],
            },
            {
                "name": "Anand Verma",
                "phone": "+91 98765 43212",
                "garage_name": "Anand Bike Point",
                "address": "Near Old Bus Stand",
                "default_pct": Decimal("5.00"),
                "commissions": [
                    ("TVS", Decimal("8.50")),
                    ("Minda", Decimal("10.00")),
                    ("Hero", Decimal("7.50")),
                ],
            },
        ]

        for m_data in mechanics_data:
            res = await db.execute(select(Mechanic).where(Mechanic.phone == m_data["phone"]))
            mech = res.scalar_one_or_none()
            if not mech:
                mech = Mechanic(
                    name=m_data["name"],
                    phone=m_data["phone"],
                    garage_name=m_data["garage_name"],
                    address=m_data["address"],
                    default_commission_percentage=m_data["default_pct"],
                    is_active=True,
                )
                db.add(mech)
                await db.flush()

                for brand_name, pct in m_data["commissions"]:
                    if brand_name in brand_map:
                        comm = MechanicBrandCommission(
                            mechanic_id=mech.id,
                            brand_id=brand_map[brand_name].id,
                            commission_percentage=pct,
                        )
                        db.add(comm)
                print(f"Seeded mechanic: {m_data['name']} ({m_data['garage_name']})")

        await db.commit()
        print("Seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
