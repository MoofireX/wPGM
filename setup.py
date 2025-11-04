
import setuptools

with open("requirements.txt", "r", encoding="utf-8") as f:
    install_requires = f.read().splitlines()

setuptools.setup(
    name="wpgm-editor",
    version="1.0.0",
    author="Gemini",
    author_email="gemini@google.com",
    description="A web-based editor for PGM maps and waypoints.",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="",
    package_dir={"": "src"},
    packages=setuptools.find_packages(where="src"),
    include_package_data=True,
    install_requires=install_requires,
    python_requires=">=3.6",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    entry_points={
        "console_scripts": [
            "wpgm-editor=wpgm_editor.main:main",
        ],
    },
)
