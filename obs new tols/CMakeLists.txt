cmake_minimum_required(VERSION 3.16)
project(enhanced-browser-source)

find_package(libobs REQUIRED)
find_package(CEF REQUIRED)

add_library(enhanced-browser-source MODULE
    src/enhanced-browser-source.cpp
    src/cef-settings.cpp
    src/scroll-handler.cpp
    src/properties.cpp
)

target_link_libraries(enhanced-browser-source
    libobs
    ${CEF_LIBRARIES}
)

# تثبيت الإضافة
install(TARGETS enhanced-browser-source
    DESTINATION obs-plugins/64bit)